class com.iconnicholson.onehammer.ASnowDudie
{
   var dudiemc;
   var sounds;
   var stage;
   var walkendx;
   var walkendy;
   var didfirstwalk = false;
   var dead = false;
   var walking = false;
   var walkspeed = 5;
   function ASnowDudie(stage, sounds)
   {
      this.stage = stage;
      this.sounds = sounds;
      mx.events.EventDispatcher.initialize(this);
   }
   function setwalkendx(n)
   {
      this.walkendx = n;
   }
   function setwalkendy(n)
   {
      this.walkendy = n;
   }
   function setwalkspeed(i)
   {
      this.walkspeed = i;
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
   function setposition(x, y)
   {
      this.dudiemc._x = x;
      this.dudiemc._y = y;
   }
   function checkline(x1, y1, x2, y2, x, y, less)
   {
      var _loc3_ = (y2 - y1) / (x2 - x1);
      var _loc7_ = _loc3_ * x - _loc3_ - x1 + y1;
      var _loc1_ = (y - y1) / _loc3_ + x1;
      if(less)
      {
         if(x < _loc1_)
         {
            x = _loc1_;
         }
      }
      else if(x > _loc1_)
      {
         x = _loc1_;
      }
      var _loc4_ = new Array();
      _loc4_[0] = x;
      _loc4_[1] = y;
      return _loc4_;
   }
   function destroy()
   {
      this.dudiemc.removeMovieClip();
   }
}
