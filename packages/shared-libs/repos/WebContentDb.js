const db = require("../db");
const logger = require("../utils/logger");
const { redisClient} = require("../rdb");

function findNodeAndChildren(tree, targetId) {
	const result = [];

	function traverse(node) {
		if (node.id === targetId) {
			collectIds(node);
			return true;
		}
		if (node.children) {
			for (const child of node.children) {
				if (traverse(child)) return true;
			}
		}
		return false;
	}

	function collectIds(node) {
		result.push(node.id);
		if (node.children) {
			for (const child of node.children) {
				collectIds(child);
			}
		}
	}

	traverse(tree);
	return result;
}

class WebContentDb {

	constructor() {
	}


	getFragmentsNameFromTemplate(tmpl, includeParse = true) {
		const regexLayout = /\$[!]?[a-zA-Z_]+?Layout/g;
		const regexParse = /#parse\(\s*["'](.*?)["']\s*\)/g;

		let fragments = [];

		const matchesLayout = tmpl.match(regexLayout);
		if (matchesLayout) {
			fragments = matchesLayout.map((match) =>
			  match.replace('$', '').replace('!', '')
			);
		}

		if (includeParse) {
			const matchesParse = tmpl.match(regexParse);
			if (matchesParse) {
				fragments = fragments.concat(
				  matchesParse.map((match) =>
					match.match(/#parse\(\s*["'](.*?)["']\s*\)/)[1].replace('.vm', '')
				  )
				);
			}
		}

		return fragments;
	}


	mapRow(r, parent) {

		var config = null;
		var isCacheable = false;
		let visibility = r.Visibility;
		let devices = [];
		try {
			config = r.Configuration != null && r.Configuration.length > 0 ? JSON.parse(r.Configuration.replace(/'/g, '"')) : null;
			if (config != null && config["cache-enabled"] != null) {
				var cacheEnable = config["cache-enabled"];
				if (cacheEnable == true || cacheEnable == "true" || cacheEnable == "1") {
					isCacheable = true;
				}
			}
		} catch (err) {
			//  console.log("here");
		}

		const children = [];


		let isVisible = true;
		if (r.DisplaySettings && r.DisplaySettings.length > 0) {
			var displaySettings = JSON.parse(r.DisplaySettings);
			if (displaySettings.devices && displaySettings.devices.length > 0) {
				devices = displaySettings.devices;
			}

			if (displaySettings.isCacheable) {
				isCacheable = displaySettings.isCacheable;
			}

			if (displaySettings.isVisible != null) {
				isVisible = displaySettings.isVisible;
				visibility = 0; // 0 Public, 1 Private, 2 Hidden
			}

		}


		return {
			id: r.Id,
			name: r.Name,
			type: r.Type,
			subtype: r.Subtype,
			version: r.Version,
			location: r.Location == null ? r.WebContentLocation : r.Location,
			isEnabled: r.IsEnabled,
			isModified: r.IsModified,
			image: r.CategoryImage,
			title: r.Title,
			domainId: r.DomainId,
			visibility: visibility,
			webSiteId: r.WebSiteId,
			isCacheable: isCacheable,
			isVisible: isVisible,
			devices: devices,
			orderWeight: r.OrderWeight,
			webContent: r.WebContentId > 0 ? {
				id: r.WebContentId,
				name: r.WebContentName,
				location: r.WebContentLocation
			} : null,
			parent: parent != null ? {
				id: parent.id,
				name: parent.name,
				parent: parent.parent,
				webSiteId: r.WebSiteId
			} : null,
			children: children,
			//        config: config,
			//  configuration: r.Configuration
		};
	}

	async addFragmentsToTemplate(wcc) {
		if (!wcc.isModified)
			return;

		var template = await this.findWidgetTemplate(wcc.id, wcc.domainId);
		var fragments = this.getFragmentsNameFromTemplate(template, false);

		for (const f of fragments) {

			const child = wcc.children.find(c => c.type === 11 && c.name === f);

			if (child != null) {
				continue
			}

			wcc.children.push({
				type: 11,
				subtype: 0,
				name: f,
				id: 0,
				location: f,
				domainId: wcc.id,
				webSiteId: wcc.webSiteId,
				isModified: false,
				isCacheable: true,
				children: []
			});

		}

	}

	async createTree(parent, rows) {

		const rowChildren = rows.filter(c => c.ParentId === parent.id);

		const children = [];
		for (var rChild of rowChildren) {
			const child = this.mapRow(rChild, parent);

			await redisClient.set("webcontent:config:" + rChild.Id, rChild.Configuration != null ? rChild.Configuration : "{}")
			children.push(child);
		}


		if (children.length > 0) {
			parent.children.push(...children);
		}


		for (const child of parent.children) {
			await this.createTree(child, rows);

			// add template fragments


			if (child.children == null || child.children.length == 0)
				child.isLeaf = true;
			else
				child.isLeaf = false;
		}

		if (parent.type == 1) {
			await this.addFragmentsToTemplate(parent);
		}

		return parent;
	}

	async findByType(type, websiteId, domainId) {
		let connection = await db.pool.getConnection();

		try {

			const [rows] = await connection.execute(`
SELECT  
    wcc.Id,
    wcc.Name,
    wcc.Version,
    wcc.DomainId,
    wcc.Type,
    wcc.Subtype,
    wcc.Location,
    wcc.Title,
    wcc.IsEnabled,
    IF(wcc.Template IS NULL OR wcc.Template = '', 0, 1) IsModified,
    wcc.WebContentId,
    ifnull(wcc.Visibility, 0) as Visibility,
    wcc.Configuration,
    wcc.WebSiteId,
    wc.Description as WebContentName,
    wc.Location as WebContentLocation,
    wcc.OrderWeight,
    IFNULL(wca.ParentId, 0) ParentId
        FROM 
    WebContentConfiguration wcc
        LEFT OUTER JOIN 
    WebContent wc on wc.Id = wcc.WebContentId
       LEFT OUTER JOIN
    WebContentConfigurationAssociation wca ON wcc.Id = wca.ChildId
        WHERE
   wcc.DomainId = ? and wcc.WebSiteId = ? and wcc.Type = ?
        ORDER BY
        wcc.OrderWeight
         `
			  , [domainId, websiteId, type]);

			return rows;

		} catch (error) {
			console.log(error);
			throw error;
		} finally {
			await connection.release();
		}

	}

	async createIdsTree(websiteId, domainId) {

		const connection = await db.pool.getConnection();
		try {
			const [rows, fields] = await connection.execute(
			  ` SELECT
              wcc.Id,
              IFNULL(wca.ParentId, 0) ParentId
          
          FROM
              WebContentConfiguration wcc
                  LEFT OUTER JOIN
              WebContent wc on wc.Id = wcc.WebContentId
                 LEFT OUTER JOIN
              WebContentConfigurationAssociation wca ON wcc.Id = wca.ChildId
          WHERE
              wcc.DomainId = ? and wcc.WebSiteId = ?
                      ORDER BY
                  wcc.Id desc `, [domainId, websiteId]
			);


			var websiteTemplate = await this.getWebSiteTemplate(websiteId, domainId);
			var root = rows.find(r => r.ParentId === 0);
			// some plugins are not attached to the website tree
			var plugins = await this.findByType(6, websiteId, domainId /* type plugin*/);
			if (plugins != null) {
				var orphanPlugins = plugins.filter(c => c.ParentId == null || c.ParentId == 0);
				for (const op of orphanPlugins) {
					op.ParentId = websiteTemplate.Id;
					rows.push(op);
				}
			}
			logger.info("WebContentDb::createTree Total rows " + rows.length);

			var root = {id: websiteTemplate.Id, children: []};
			await this._recurseIdsTree(root, rows);

			return root;
		} catch (error) {
			console.log(error);
			throw error;
		} finally {
			await connection.release();
		}

	}

	async _recurseIdsTree(parent, rows) {

		if (!parent.children)
			parent.children = [];

		const rowChildren = rows.filter(c => c.ParentId === parent.id);

		for (var rChild of rowChildren) {
			parent.children.push({id: rChild.Id, children: []});
		}

		for (const child of parent.children) {
			await this._recurseIdsTree(child, rows);
		}
	}

	async getWebSiteTemplate(websiteId, domainId) {
		const connection = await db.pool.getConnection();
		try {
			const [websiteTemplate] = await connection.execute(`
SELECT  
    wcc.Id,
    wcc.Name,
    wcc.Version,
    wcc.DomainId,
    wcc.Type,
    wcc.Subtype,
    wcc.Location,
    wcc.Title,
    wcc.IsEnabled,
    IF(wcc.Template IS NULL OR wcc.Template = '', 0, 1) IsModified,
    wcc.WebContentId,
    ifnull(wcc.Visibility, 0) as Visibility,
    wcc.Configuration,
    wcc.WebSiteId,
    wc.Description as WebContentName,
    wc.Location as WebContentLocation,
    wcc.OrderWeight,
    0 ParentId
        FROM 
    WebSite ws 
        JOIN 
    WebContentConfiguration wcc on wcc.Id = ws.TemplateInstanceId 
       LEFT OUTER JOIN 
    WebContent wc on wc.Id = wcc.WebContentId
where ws.Id = ?
        ORDER BY
        wcc.OrderWeight

`, [websiteId]);

			if (websiteTemplate.length == 0)
				throw Error(`Unable to find website with id ${websiteId}`);

			return websiteTemplate[0];
		} finally {
			await connection.release();
		}
	}

	async findWccAuxTree(id, websiteId, domainId) {


		const connection = await db.pool.getConnection();


		try {

			const idsTree = await this.createIdsTree(websiteId, domainId);

			const ids = findNodeAndChildren(idsTree,id);
			if(ids.length == 0)
				ids.push(id);

			const [rows, fields] = await connection.query(
			  `   

SELECT 
    wcc.Id,
    wcc.Name,
    wcc.Version,
    wcc.DomainId,
    wcc.Type,
    wcc.Subtype,
    wcc.Location,
    wcc.Title,
    wcc.IsEnabled,
    IF(wcc.Template IS NULL OR wcc.Template = '', 0, 1) IsModified,
    wcc.WebContentId,
    ifnull(wcc.Visibility, 0) as Visibility,
    wcc.Configuration,
    wcc.WebSiteId,
    wc.Description as WebContentName,
    wc.Location as WebContentLocation,
    wca.ChildId,
    wcc.OrderWeight,
    IFNULL(wca.ParentId, 0) ParentId,
    wcc.DisplaySettings
    
FROM
    WebContentConfiguration wcc
        LEFT OUTER JOIN 
    WebContent wc on wc.Id = wcc.WebContentId
       LEFT OUTER JOIN
    WebContentConfigurationAssociation wca ON wcc.Id = wca.ChildId
WHERE
    wcc.DomainId = ? and wcc.WebSiteId = ? and wcc.Id in (?)
            ORDER BY
        wcc.OrderWeight
`, [domainId, websiteId, ids]
			);

			const rootDb = await rows.find(r => r.Id === id);
			const root = this.mapRow(rootDb, null);

			await this.createTree(root, rows);
			return root;
		} catch (error) {
			console.log(error);
			throw error;
		} finally {
			await connection.release();
		}
	}


	async createWebSiteTree(websiteId, domainId) {

		const connection = await db.pool.getConnection();


		try {

			const [rows, fields] = await connection.execute(
			  `   

SELECT 
    wcc.Id,
    wcc.Name,
    wcc.Version,
    wcc.DomainId,
    wcc.Type,
    wcc.Subtype,
    wcc.Location,
    wcc.Title,
    wcc.IsEnabled,
    IF(wcc.Template IS NULL OR wcc.Template = '', 0, 1) IsModified,
    wcc.WebContentId,
    ifnull(wcc.Visibility, 0) as Visibility,
    wcc.Configuration,
    wcc.WebSiteId,
    wc.Description as WebContentName,
    wc.Location as WebContentLocation,
    wca.ChildId,
    wcc.OrderWeight,
    IFNULL(wca.ParentId, 0) ParentId,
    wcc.DisplaySettings
    
FROM
    WebContentConfiguration wcc
        LEFT OUTER JOIN 
    WebContent wc on wc.Id = wcc.WebContentId
       LEFT OUTER JOIN
    WebContentConfigurationAssociation wca ON wcc.Id = wca.ChildId
WHERE
    wcc.DomainId = ? and wcc.WebSiteId = ?  -- and wcc.Subtype not in (6, 22) 
    and wcc.Subtype not in (6, 22)
            ORDER BY
        wcc.OrderWeight
`, [domainId, websiteId]
			);


			var websiteTemplate = await this.getWebSiteTemplate(websiteId, domainId);
			logger.info("WebContentDb::createWebSiteTree total rows: " + rows.length);
			const root = this.mapRow(websiteTemplate, null);
			await redisClient.set("webcontent:config:" + websiteTemplate.Id, websiteTemplate.Configuration ? websiteTemplate.Configuration : "{}")

			// some plugins are not attached to the website tree
			var plugins = await this.findByType(6, websiteId, domainId /* type plugin*/);
			if (plugins != null) {
				var orphanPlugins = plugins.filter(c => c.ParentId == null || c.ParentId == 0);
				for (const op of orphanPlugins) {
					op.ParentId = root.id;
					rows.push(op);
				}
			}
			logger.info("WebContentDb::createTree Total rows " + rows.length);

			await this.createTree(root, rows);


			//   root.id = websiteId;

			return root;
		} catch (error) {
			console.log(error);
			throw error;
		} finally {
			await connection.release();
		}
	}


	async findWccTree(wccId) {

	}

	async findWidgetTemplate(id, domainId) {
		const connection = await db.pool.getConnection();

		try {
			const [rows, fields] = await connection.execute(
			  `   
select Template from WebContentConfiguration where DomainId = ? and Id = ?
`, [domainId, id]
			);

			if (rows == null || rows.length == 0)
				return "";


			return rows[0].Template;
		} catch (error) {
			console.log(error);
		} finally {
			await connection.release();
		}
	}

	async queryNavigation(wccId){
		const connection = await db.pool.getConnection();

		try {
			const [rows, fields] = await connection.execute(
`

WITH RECURSIVE ContentTree AS (
    -- Base case: start with the given WebContent Id
    SELECT
        wcc.Id,
        wcc.Name,
        wcc.DomainId,
        not(isnull(wcc.Template) || wcc.Template = '') as IsModified,
        wc.Location as WebContentLocation,
        wcc.Type,
        wcc.Subtype,
        wcc.OrderWeight,
        0 AS Level,
        CAST(wcc.Id AS CHAR(1000)) AS Path
    FROM WebContentConfiguration wcc
    LEFT OUTER JOIN WebContent wc on wcc.WebContentId = wc.Id
WHERE wcc.Id = ?

    UNION ALL

    -- Recursive case: find children
    SELECT
        wcc.Id,
        wcc.Name,
        wcc.DomainId,
        not(isnull(wcc.Template) || wcc.Template = '') as IsModified,
        wc.Location as WebContentLocation,
        wcc.Type,
        wcc.Subtype,
        wcc.OrderWeight,
        ct.Level + 1,
        CONCAT(ct.Path, '/', wcc.Id)
    FROM webcontentconfiguration wcc
    LEFT OUTER JOIN WebContent wc on wcc.WebContentId = wc.Id
    INNER JOIN WebContentConfigurationAssociation wca ON wcc.Id = wca.ChildId
    INNER JOIN ContentTree ct ON wca.ParentId = ct.Id
    WHERE wcc.Type = 7 and wcc.Subtype not in (6)
)
SELECT * FROM ContentTree
ORDER BY Level, OrderWeight;
			  
			  
			  
`, [wccId]);


			return rows;
		} finally {
			await connection.release();
		}
	}


	async queryTree(wccId) {
		const connection = await db.pool.getConnection();

		try {
			const [rows, fields] = await connection.execute(
			  `   
WITH RECURSIVE ContentTree AS (
    -- Base case: start with the given WebContent Id
    SELECT
        wcc.*,
        wc.Location as WebContentLocation,
		not(isnull(wcc.Template) || wcc.Template = '') as IsModified,
        0 AS Level,
        CAST(wcc.Id AS CHAR(1000)) AS Path
    FROM WebContentConfiguration wcc
    LEFT OUTER JOIN WebContent wc on wcc.WebContentId = wc.Id
WHERE wcc.Id = ? 

    UNION ALL

    -- Recursive case: find children
    SELECT
        wcc.*,
        wc.Location as WebContentLocation,
        not(isnull(wcc.Template) || wcc.Template = '') as IsModified,
        ct.Level + 1,
        CONCAT(ct.Path, ':', wcc.Id)
    FROM webcontentconfiguration wcc
    LEFT OUTER JOIN WebContent wc on wcc.WebContentId = wc.Id
    INNER JOIN WebContentConfigurationAssociation wca ON wcc.Id = wca.ChildId
    INNER JOIN ContentTree ct ON wca.ParentId = ct.Id
)
SELECT * FROM ContentTree
ORDER BY Path;
`, [wccId]			);


			return rows;
		} catch (error) {
			console.log(error);
		} finally {
			await connection.release();
		}
	}

	async findWebSite(webSiteId, domainId) {
		const connection = await db.pool.getConnection();

		try {
			const [rows, fields] = await connection.execute(
			  `SELECT * FROM WebSite where Id = ?`, [webSiteId]
			);

			if(rows == null || rows.length == 0)
				return null;

			return rows[0];
		} finally {
			await connection.release();
		}

	}

	async listWccIdsBySubtype( webSiteId, subtype) {
		const connection = await db.pool.getConnection();

		try {
			const [rows, fields] = await connection.execute(
			  `SELECT Id FROM WebContentConfiguration where WebSiteId = ? and Subtype = ?`, [webSiteId, subtype]
			);

			if(rows == null || rows.length == 0)
				return null;

			return rows.map(r => r.Id);
		} finally {
			await connection.release();
		}

	}

	async FindWccByWebContentId(webContentId, webSiteId, domainId) {
		const connection = await db.pool.getConnection();

		try {
			const [rows, fields] = await connection.execute(
			  `SELECT * FROM WebContentConfiguration where WebSiteId = ?  and WebContentId = ?`, [webSiteId, webContentId]
			);

			if(rows == null || rows.length == 0)
				return null;

			return rows[0];
		} finally {
			await connection.release();
		}
	}
}

module.exports.WebContentDb = WebContentDb;