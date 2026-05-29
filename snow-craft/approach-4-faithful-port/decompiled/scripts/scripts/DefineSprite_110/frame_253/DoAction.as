var me = this;
this.fromyour.scorebox.text = "SCORE: " + this.score;
this.fromyour.playagain.onRelease = function()
{
   me._visible = false;
   _root.gotoAndPlay(1);
};
this.fromyour.visit.onRelease = function()
{
   getURL("http://www.iconnicholson.com", "_blank");
};
this.fromyour.creditsblock.onRelease = function()
{
   _root.titles._visible = true;
   _root.titles.gotoAndPlay("credits");
};
