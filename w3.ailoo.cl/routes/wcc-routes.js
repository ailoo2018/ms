const {app} = require( "../server" );
const {findWidget} = require( "../db/webcontent" );
const cmsClient = require("../services/cmsClient")

const baseUrl = process.env.CMS_URL;

function getNuxtComponent(w){
  if(w.name === "Html_CarruselMotocard"){
    return "Swiper"
  }
  if(w.name === "Html_ClickAndCollect"){
    return "ScrollingText"
  }
  if(w.name === "Html_BikeSearchBlock"){
    return "BikeSearch"
  }
  if(w.name === "Html_AddedValuesMotocard"){
    return "AddedValues"
  }
  if(w.name === "Html_SingleBanner"){
    return "SingleBanner"
  }

  if(w.name === "HomeCategoriesLifeStyle"){
    return "HomeCategories"
  }
  if(w.name === "Html_ProductListMotocard"){
    return "FeaturedProducts"
  }


  return "Dummy"
}

app.get('/:domainId/wcc/:id', async (req, res, next) => {

  try{
    const id = parseInt(req.params.id);
    const domainId = parseInt(req.params.domainId);

    const wccAux = await cmsClient.getWcc(id, domainId)

    const widgets = wccAux.children.filter(w => w.type === 3).map(w2 => {
      const component = getNuxtComponent(w2)
      return { id: w2.id, name: w2.name, configuration: w2.config, component };
    });

    res.json({
      widgets: widgets,
    })
  }catch(err){
    next(err)
  }

});


