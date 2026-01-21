const {promises: fs} = require("fs");
const {redisClient} = require("../rdb");
const path = require("path");
const WCC_EXPIRY = 24 * 60 * 60  // 5 hours in seconds (18000 seconds)

function getWccKey(wccId, domainId) {
  return 'wcc:' + domainId + ':*' + wccId + '*';
}

function templatesDir(webSiteId, domainId) {
  return path.join(process.cwd(), 'templates', '' + domainId, '' + webSiteId);
}
function filePath(wccId, webSiteId, domainId) {
  return path.join(templatesDir(webSiteId, domainId), wccId + '.vm');

}
function removeCodeBlock(html) {
  if (html == null)
    return null;
  const regex = /<script\s+type="application\/json"\s+id="ailoo-metadata">(.*?)<\/script>/gs;
  return html.replace(regex, '');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}


async function loadWccAux(wccId, domainId, db) {
//  var db = new WebContentDb();
  var rows = await db.queryTree(wccId)

  rows = rows.sort((a, b) => a.OrderWeight - b.OrderWeight);


  var childrenIds = []
  var children = []
  var wccaux = null;
  for (var r of rows) {



    var path = r.Path.split(":");
    var parentId = 0;
    if(path.length > 1) {
      parentId = parseInt( path[path.length - 2] )
    }

    let config = null;
    let isCacheable = false;
    if (r.Configuration != null && r.Configuration.length > 0) {
      try {
        config = JSON.parse(r.Configuration)
        if (config.config) {
          config = config.config;
        }

        if(config["cache-enabled"] === true){
          isCacheable = true;
        }

      }catch(e){
        logger.error(`Unable to parse config: ${r.Id} ${r.Configuration} `  );
      }

    }

    let displaySettings = null;
    if(r.DisplaySettings != null && r.DisplaySettings.length > 0) {
      try {
        displaySettings = JSON.parse(r.DisplaySettings)

        if(!isCacheable && displaySettings.isCacheable)
          isCacheable = true;
      }catch(e){
        logger.error(`Unable to parse config: ${r.Id} ${r.Configuration} `  );
      }

    }

    if (wccId === r.Id) {
      var aux = {
        id: r.Id,
        name: r.Name,
        version: r.Version,
        location: r.Location,
        type: r.Type,
        subtype: r.Subtype,
        webSiteId: r.WebSiteId,
        domainId: r.DomainId,
        config: config,
        level: r.Level,
        link: r.Link,
        isModified: r.IsModified,
        isCacheable:  isCacheable,
        displaySettings: displaySettings,
        webContent: r.WebContentId != null ? {
          id: r.WebContentId,
          location: r.WebContentLocation,
        } : null,
        path: r.Path,
        parentId: parentId,
        childrenIds: [],
        orderWeight: r.OrderWeight,
      }

      wccaux= aux;

      if (r.Template != null && r.Template.length > 0) {

        var fragments = getFragmentsNameFromTemplate(r.Template);
        wccaux.fragments =fragments;

        // save widget template to file
        const tplDir = templatesDir(r.WebSiteId, r.DomainId);
        await fs.mkdir(tplDir, {recursive: true});
        const fpath = filePath(r.Id, r.WebSiteId, r.DomainId)
        await fs.writeFile(fpath, r.Template, 'utf8');
      }
    } else {
      if(parentId === wccId && r.Type !== 7) {
        childrenIds.push(r.Id);
        children.push({
          id: r.Id,
          name: r.Name,
          version: r.Version,
          location: r.Location,
          type: r.Type,
          subtype: r.Subtype,
          webSiteId: r.WebSiteId,
          domainId: r.DomainId,
          isCacheable:  isCacheable,
          isModified: r.IsModified,
          orderWeight: r.OrderWeight,
          config: config,
          displaySettings: displaySettings,

        });

        if (r.Template != null && r.Template.length > 0) {


          const tplDir = templatesDir(r.WebSiteId, r.DomainId);
          await fs.mkdir(tplDir, {recursive: true});

          const fpath = filePath(r.Id, r.WebSiteId, r.DomainId)
          await fs.writeFile(fpath, r.Template, 'utf8');
        }
      }
    }



  }

  if(wccaux != null) {
    wccaux.childrenIds = childrenIds;
    wccaux.children = children
    const key = getWccKey(wccaux.id, wccaux.domainId)
    const redRes = await redisClient.set(key, JSON.stringify(wccaux), {EX: WCC_EXPIRY})
  }

  return wccaux;
}

async function findWccAux(wccId, domainId, redisClient) {
  var val = await redisClient.get(getWccKey(wccId, domainId));
  if (val) {
    var wcc = JSON.parse(val);
    return wcc;
  }

  return null;
}


class CmsService {


  constructor({ redisClient, webContentDb }) {
    this.redisClient = redisClient
    this.webContentDb = webContentDb
  }

  async findOrLoadWccAux(wccId, domainId, force) {
    var wccAux = await findWccAux(wccId, domainId, this.redisClient);
    if (!wccAux || force) {
      await loadWccAux(wccId, domainId, this.webContentDb);
      wccAux = await findWccAux(wccId, domainId, this.redisClient)
      if(!wccAux)
        throw Error("Wcc not found: " + wccId)
      wccAux.source = "db"
      return wccAux;
    }else{
      wccAux.source = "redis";
      return wccAux;
    }

  }



}

module.exports = CmsService;