var lc = new LocalConnection();
var domain = lc.domain();
trace(domain);
if(domain != "localhost" && domain != "chiudesign.com" && domain != "iconnicholson.com" && domain != "onehammer;com" && domain != "www.chiudesign.com" && domain != "chiudesign.com" && domain != "www.nny.com" && domain != "nny.com" && domain != "nicholsonny.com" && domain != "www.onehammer.com")
{
   _root.titles._visible = true;
   _root.titles.gotoAndPlay("error");
   trace("wfw");
   stop();
}
