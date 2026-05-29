class com.iconnicholson.onehammer.AGame
{
   var hackparent;
   var paused = true;
   function AGame(floop)
   {
      floop.onEnterFrame = this.floopenterframe;
      floop.hackparent = this;
      mx.events.EventDispatcher.initialize(this);
   }
   function ongameover()
   {
      var _loc2_ = {target:this,type:"gameover"};
      this.dispatchEvent(_loc2_);
   }
   function floopenterframe()
   {
      this.hackparent.frameloop();
   }
   function frameloop()
   {
   }
   function dispatchEvent()
   {
   }
   function addEventListener()
   {
   }
   function removeEventListener()
   {
   }
}
