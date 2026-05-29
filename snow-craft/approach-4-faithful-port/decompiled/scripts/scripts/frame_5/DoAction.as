function gameover(eventObject)
{
   trace("game over");
}
stop();
trace("s");
if(!_root.game)
{
   _root.game = new com.iconnicholson.onehammer.Snowcraft1Rewrite(_root.floop,_root.gamemc,_root.titles,_root.sounds);
   _root.game.addEventListener("gameover",this);
   _root.game.dolevel(1);
}
else
{
   _root.game.reset();
   _root.game.dolevel(1);
}
var lastkey = "";
var secondfromlastkey = "";
var keyListener = new Object();
keyListener.onKeyDown = function()
{
   if(lastkey == "v" && secondfromlastkey == "l")
   {
      _root.game.dolevel(Number(chr(Key.getAscii())));
   }
   if(lastkey == "r" && secondfromlastkey == "c")
   {
      _root.titles._visible = true;
      _root.titles.gotoAndPlay("credits");
      _root.titles._visible = true;
   }
   secondfromlastkey = lastkey;
   lastkey = chr(Key.getAscii());
};
Key.addListener(keyListener);
