class com.iconnicholson.onehammer.RedSnowDudie extends com.iconnicholson.onehammer.ASnowDudie
{
   var dudiemc;
   var hackparent;
   var sounds;
   var stage;
   var team;
   var walkendx;
   var walkendy;
   var walkxmov;
   var walkymov;
   static var highestreddudie;
   var hitpoints = 2;
   var dazed = 0;
   var adobesucksmouseisdownflag = false;
   var dragdudie = false;
   var olddepth = 0;
   function RedSnowDudie(stage, sounds)
   {
      super(stage,sounds);
      _root.comiter = _root.comiter + 1;
      this.dudiemc = stage.attachMovie("reddudie","reddudie" + _root.comiter,_root.comiter);
      this.dudiemc.selectioncircle._visible = false;
      this.dudiemc.hackparent = this;
      com.iconnicholson.onehammer.RedSnowDudie.highestreddudie = this.dudiemc;
      this.dudiemc.onPress = this.redpress;
      this.dudiemc.onRelease = this.redrelease;
      this.team = "red";
      this.dudiemc.onRollOver = this.redrollover;
      this.dudiemc.onRollOut = this.redrollout;
      mx.events.EventDispatcher.initialize(this);
   }
   function redrollover()
   {
      this.hackparent.mouseover();
   }
   function redrollout()
   {
      this.hackparent.mouserollout();
   }
   function redpress()
   {
      this.hackparent.onchosen();
   }
   function redrelease()
   {
      this.hackparent.mouserelease();
   }
   function onchosen()
   {
      if(this.dudiemc.dazed || this.dead || this.walking)
      {
         return undefined;
      }
      this.adobesucksmouseisdownflag = true;
      if(this.dudiemc.getDepth() < com.iconnicholson.onehammer.RedSnowDudie.highestreddudie.getDepth())
      {
         this.dudiemc.swapDepths(com.iconnicholson.onehammer.RedSnowDudie.highestreddudie);
      }
      com.iconnicholson.onehammer.RedSnowDudie.highestreddudie = this.dudiemc;
      var _loc2_ = {target:this,type:"chosen"};
      this.dispatchEvent(_loc2_);
      this.dragdudie = true;
      this.dudiemc.gotoAndPlay("cock");
   }
   function yougothit()
   {
      this.dragdudie = false;
      this.dudiemc.selectioncircle._visible = false;
      this.adobesucksmouseisdownflag = false;
      this.hitpoints = this.hitpoints - 1;
      if(this.hitpoints == 1)
      {
         this.dazed = 40;
         this.dudiemc.dazed = true;
         this.dudiemc.gotoAndPlay("hitdazed");
         this.sounds.gotoAndPlay("hit1");
         this.sounds.gotoAndPlay("birds");
      }
      var _loc3_;
      if(this.hitpoints == 0)
      {
         this.dead = true;
         _root.grounditer = _root.grounditer + 1;
         _loc3_ = this.stage.createEmptyMovieClip("deadreddudie" + _root.grounditer,_root.grounditer);
         this.dudiemc.swapDepths(_loc3_);
         this.dudiemc.gotoAndPlay("dead");
         this.sounds.gotoAndPlay("kids" + Math.ceil(Math.random() * 3));
      }
   }
   function mouseover()
   {
      if(this.dudiemc.dazed || this.dead || this.walking)
      {
         return undefined;
      }
      this.dudiemc.selectioncircle._visible = true;
   }
   function mouserollout()
   {
      this.dudiemc.selectioncircle._visible = false;
      if(this.dudiemc.dazed || this.dead || this.walking)
      {
         return undefined;
      }
      this.dudiemc.gotoAndStop("ready");
   }
   function throwball()
   {
      var _loc2_ = 0.001;
      trace(this.dudiemc.meter._currentframe);
      if(this.dudiemc.meter._currentframe > 4)
      {
         _loc2_ = this.dudiemc.meter._currentframe / 15;
      }
      var _loc3_ = {target:this,type:"throwball",force:_loc2_,team:this.team,x:this.dudiemc._x,y:this.dudiemc._y - 35,ineffective:_loc2_ < 0.1};
      this.dispatchEvent(_loc3_);
   }
   function mouserelease()
   {
      this.adobesucksmouseisdownflag = false;
      this.dragdudie = false;
      if(this.dudiemc.dazed || this.dead || this.walking)
      {
         return undefined;
      }
      this.throwball();
      this.dudiemc.gotoAndStop("toss");
   }
   function frameloop()
   {
      if(this.dead)
      {
         return undefined;
      }
      if(this.walking)
      {
         if(Math.abs(this.dudiemc._x - this.walkendx) < 10 && Math.abs(this.dudiemc._y - this.walkendy) < 10)
         {
            this.walking = false;
            this.walkendx = this.walkendy = 0;
            this.dudiemc.gotoAndStop("ready");
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
      var _loc3_;
      if(this.walkendx)
      {
         this.walking = true;
         this.dudiemc.gotoAndPlay("walk");
         _loc3_ = Math.sqrt(Math.pow(this.walkendy - this.dudiemc._y,2) + Math.pow(this.walkendx - this.dudiemc._x,2));
         this.walkxmov = (this.walkendx - this.dudiemc._x) / (_loc3_ / this.walkspeed);
         this.walkymov = (this.walkendy - this.dudiemc._y) / (_loc3_ / this.walkspeed);
         return undefined;
      }
      if(this.dazed)
      {
         this.dazed = this.dazed - 1;
         if(this.dazed == 0)
         {
            this.dudiemc.dazed = false;
            this.dudiemc.gotoAndStop("ready");
         }
      }
      var _loc2_;
      if(this.adobesucksmouseisdownflag && this.dragdudie)
      {
         this.dudiemc._x = this.stage._xmouse;
         this.dudiemc._y = this.stage._ymouse;
         _loc2_ = this.checkline(592,0,0,320,this.dudiemc._x,this.dudiemc._y,1);
         this.dudiemc._x = _loc2_[0];
         this.dudiemc._y = _loc2_[1];
      }
   }
}
