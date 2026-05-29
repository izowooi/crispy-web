class com.iconnicholson.onehammer.GreenSnowDudie extends com.iconnicholson.onehammer.ASnowDudie
{
   var dudiemc;
   var sounds;
   var stage;
   var team;
   var titles;
   var walkendx;
   var walkendy;
   var walkxmov;
   var walkymov;
   var balling = 0;
   var cocking = 0;
   var down = false;
   var hitpoints = 3;
   var adobefrozenframebugfix = 0;
   function GreenSnowDudie(stage, sounds, titles)
   {
      super(stage,sounds);
      _root.comiter = _root.comiter + 1;
      this.dudiemc = stage.attachMovie("greendudie","greendudie" + _root.comiter,_root.comiter);
      this.dudiemc.hackparent = this;
      this.titles = titles;
      this.team = "green";
      mx.events.EventDispatcher.initialize(this);
   }
   function randomdestinationwithinboundaries()
   {
      var _loc2_ = new Array();
      _loc2_[0] = Math.random() * 500;
      _loc2_[1] = Math.random() * 300;
      var _loc3_ = this.checkline(610,0,0,340,_loc2_[0],_loc2_[1],0);
      _loc2_[0] = _loc3_[0];
      _loc2_[1] = _loc3_[1];
      return _loc2_;
   }
   function yougothit()
   {
      this.walking = false;
      this.cocking = this.balling = 0;
      this.dudiemc.justhit = false;
      this.down = this.dudiemc.down = false;
      this.hitpoints = this.hitpoints - 1;
      if(this.hitpoints == 2)
      {
         this.dudiemc.justhit = true;
         this.adobefrozenframebugfix = 50;
         this.dudiemc.gotoAndPlay("hit");
         this.sounds.gotoAndPlay("hit1");
      }
      if(this.hitpoints == 1)
      {
         this.down = this.dudiemc.down = true;
         this.dudiemc.gotoAndPlay("down");
         this.sounds.gotoAndPlay("hit1");
      }
      var _loc3_;
      if(this.hitpoints == 0)
      {
         this.dudiemc.gotoAndPlay("dead");
         this.dead = true;
         _root.grounditer = _root.grounditer + 1;
         _loc3_ = this.stage.createEmptyMovieClip("deadgreendudie" + _root.grounditer,_root.grounditer);
         this.dudiemc.swapDepths(_loc3_);
         this.sounds.gotoAndPlay("kids" + Math.ceil(Math.random() * 3));
      }
   }
   function gameover()
   {
      this.dead = true;
      this.dudiemc.gotoAndPlay("yea");
   }
   function frameloop()
   {
      if(this.dead)
      {
         return undefined;
      }
      if(this.dudiemc.down)
      {
         return undefined;
      }
      this.down = false;
      if(this.dudiemc.justhit)
      {
         this.adobefrozenframebugfix = this.adobefrozenframebugfix - 1;
         if(this.adobefrozenframebugfix < 0)
         {
            this.dudiemc.justhit = false;
         }
         return undefined;
      }
      if(this.walking)
      {
         if(Math.abs(this.dudiemc._x - this.walkendx) < 10 && Math.abs(this.dudiemc._y - this.walkendy) < 10)
         {
            this.dudiemc.gotoAndStop("balling");
            if(this.titles._visible)
            {
               this.walkspeed = 3;
               return undefined;
            }
            this.walking = false;
            this.walkendx = this.walkendy = 0;
         }
         else
         {
            this.dudiemc._x += this.walkxmov;
            this.dudiemc._y += this.walkymov;
            if(this.sounds._currentframe == 1)
            {
               this.sounds.gotoAndPlay("step");
            }
         }
         return undefined;
      }
      if(this.cocking > 0)
      {
         this.cocking = this.cocking - 1;
         if(this.cocking == 10)
         {
            this.dudiemc.gotoAndStop("toss");
            this.throwball();
         }
         return undefined;
      }
      var _loc2_;
      var _loc3_;
      if(Math.random() > 0.975 || this.walkendx)
      {
         this.walking = true;
         this.dudiemc.gotoAndPlay("walk");
         if(!this.walkendx)
         {
            _loc2_ = this.randomdestinationwithinboundaries();
            this.walkendx = _loc2_[0];
            this.walkendy = _loc2_[1];
         }
         _loc3_ = Math.sqrt(Math.pow(this.walkendy - this.dudiemc._y,2) + Math.pow(this.walkendx - this.dudiemc._x,2));
         this.walkxmov = (this.walkendx - this.dudiemc._x) / (_loc3_ / this.walkspeed);
         this.walkymov = (this.walkendy - this.dudiemc._y) / (_loc3_ / this.walkspeed);
         return undefined;
      }
      if(this.titles._visible)
      {
         return undefined;
      }
      if(this.balling > 0)
      {
         this.balling = this.balling - 1;
         if(this.balling <= 0)
         {
            this.dudiemc.gotoAndStop("cock");
            this.cocking = 15 + Math.round(Math.random() * 30);
         }
         return undefined;
      }
      this.dudiemc.gotoAndStop("balling");
      this.balling = 10 + Math.round(Math.random() * 50);
   }
   function throwball()
   {
      var _loc2_ = {target:this,type:"throwball",force:0.3 + Math.random() * 0.6,team:this.team,x:this.dudiemc._x,y:this.dudiemc._y - 15};
      this.dispatchEvent(_loc2_);
   }
}
