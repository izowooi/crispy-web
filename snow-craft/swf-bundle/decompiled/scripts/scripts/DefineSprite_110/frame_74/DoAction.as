this._visible = true;
if(this.lev == 9)
{
   this.levelx.text = "Bonus Round";
}
else
{
   this.levelfade.levelx.text = "Level " + this.lev;
}
_root.sounds.gotoAndPlay("goodbadugly");
play();
