class com.iconnicholson.onehammer.Snowcraft1Rewrite extends com.iconnicholson.onehammer.AGame
{
   var adudies;
   var greendudiestartingpoints;
   var lev;
   var shiftdown;
   var snowballs;
   var sounds;
   var stage;
   var starttime;
   var titles;
   var gameover = false;
   var reddudie1startx = 450;
   var reddudie1starty = 200;
   var reddudie2startx = 420;
   var reddudie2starty = 260;
   var reddudie3startx = 310;
   var reddudie3starty = 250;
   var slomo = 0;
   var score = 0;
   function Snowcraft1Rewrite(floop, stage, titles, sounds)
   {
      super(floop);
      this.sounds = sounds;
      this.stage = stage;
      this.titles = titles;
      _root.comiter = _root.comiter + 1;
      this.snowballs = new Array();
      this.adudies = new Array();
      var _loc5_ = new Object();
      var me = this;
      _loc5_.onKeyDown = function()
      {
         me.keydown(Key.getCode());
      };
      _loc5_.onKeyUp = function()
      {
         me.keyup(Key.getCode());
      };
      Key.addListener(_loc5_);
      this.greendudiestartingpoints = new Array();
      this.greendudiestartingpoints[0] = new Array();
      this.greendudiestartingpoints[0][0] = new Array(-20,-60,180,40);
      this.greendudiestartingpoints[0][1] = new Array(-130,-60,70,40);
      this.greendudiestartingpoints[0][2] = new Array(-130,1,70,100);
      this.greendudiestartingpoints[1] = new Array();
      this.greendudiestartingpoints[1][0] = new Array(-20,-60,180,40);
      this.greendudiestartingpoints[1][1] = new Array(-130,-60,70,40);
      this.greendudiestartingpoints[1][2] = new Array(-130,1,70,100);
      this.greendudiestartingpoints[1][3] = new Array(-50,-100,-2,-99);
      this.greendudiestartingpoints[1][4] = new Array(-50,1,-49,1);
      this.greendudiestartingpoints[2] = new Array();
      this.greendudiestartingpoints[2][0] = new Array(-20,-60,180,40);
      this.greendudiestartingpoints[2][1] = new Array(-130,-60,70,40);
      this.greendudiestartingpoints[2][2] = new Array(-130,1,70,100);
      this.greendudiestartingpoints[2][3] = new Array(-50,100,-51,101);
      this.greendudiestartingpoints[2][4] = new Array(-50,150,-51,151);
      this.greendudiestartingpoints[2][5] = new Array(-100,-50,-101,-51);
      this.greendudiestartingpoints[2][6] = new Array(-150,-50,-151,-50);
      this.greendudiestartingpoints[3] = new Array();
      this.greendudiestartingpoints[3][0] = new Array(-20,-60,180,40);
      this.greendudiestartingpoints[3][1] = new Array(-130,-60,70,40);
      this.greendudiestartingpoints[3][2] = new Array(-130,1,70,100);
      this.greendudiestartingpoints[3][3] = new Array(-50,100,-51,101);
      this.greendudiestartingpoints[3][4] = new Array(-50,150,-51,151);
      this.greendudiestartingpoints[3][5] = new Array(-100,-50,-101,-51);
      this.greendudiestartingpoints[3][6] = new Array(-150,-50,-151,-50);
      this.greendudiestartingpoints[3][7] = new Array(-100,-50,-101,-51);
      this.greendudiestartingpoints[3][8] = new Array(-150,-50,-151,-50);
      this.greendudiestartingpoints[4] = new Array();
      this.greendudiestartingpoints[4][0] = new Array(-20,-60,180,40);
      this.greendudiestartingpoints[4][1] = new Array(-130,-60,70,40);
      this.greendudiestartingpoints[4][2] = new Array(-130,1,70,100);
      this.greendudiestartingpoints[4][3] = new Array(-50,100,-51,101);
      this.greendudiestartingpoints[4][4] = new Array(-50,150,-51,151);
      this.greendudiestartingpoints[4][5] = new Array(-100,-50,-101,-51);
      this.greendudiestartingpoints[4][6] = new Array(-150,-50,-151,-50);
      this.greendudiestartingpoints[4][7] = new Array(-100,-50,-101,-51);
      this.greendudiestartingpoints[4][8] = new Array(-150,-50,-151,-50);
      this.greendudiestartingpoints[4][9] = new Array(-50,100,-51,101);
      this.greendudiestartingpoints[4][10] = new Array(-50,150,-51,151);
      this.greendudiestartingpoints[4][11] = new Array(-50,100,-51,101);
      this.greendudiestartingpoints[4] = new Array();
      this.greendudiestartingpoints[4][0] = new Array(-20,-60,180,40);
      this.greendudiestartingpoints[4][1] = new Array(-130,-60,70,40);
      this.greendudiestartingpoints[4][2] = new Array(-130,1,70,100);
      this.greendudiestartingpoints[4][3] = new Array(-50,100,-51,101);
      this.greendudiestartingpoints[4][4] = new Array(-50,150,-51,151);
      this.greendudiestartingpoints[4][5] = new Array(160,-50,160,80);
      this.greendudiestartingpoints[4][6] = new Array(-150,-50,270,90);
      this.greendudiestartingpoints[4][7] = new Array(-100,-50,160,150);
      this.greendudiestartingpoints[4][8] = new Array(-150,-50,300,140);
      this.greendudiestartingpoints[4][9] = new Array(-50,100,400,150);
      this.greendudiestartingpoints[4][10] = new Array(-50,150,-51,151);
      this.greendudiestartingpoints[4][11] = new Array(-50,100,300,205);
      var _loc4_ = 0;
      while(_loc4_ < this.greendudiestartingpoints[4].length)
      {
         this.greendudiestartingpoints[4][_loc4_][0] = this.greendudiestartingpoints[4][_loc4_][2] - 400;
         this.greendudiestartingpoints[4][_loc4_][1] = this.greendudiestartingpoints[4][_loc4_][3] - 200;
         _loc4_ = _loc4_ + 1;
      }
      this.greendudiestartingpoints[5] = new Array();
      this.greendudiestartingpoints[5][0] = new Array(-20,-60,520,40);
      this.greendudiestartingpoints[5][1] = new Array(-130,-60,460,80);
      this.greendudiestartingpoints[5][2] = new Array(-130,1,400,130);
      this.greendudiestartingpoints[5][3] = new Array(-50,100,340,165);
      this.greendudiestartingpoints[5][4] = new Array(-50,150,280,200);
      this.greendudiestartingpoints[5][5] = new Array(160,-50,230,250);
      this.greendudiestartingpoints[5][6] = new Array(-150,-50,470,40);
      this.greendudiestartingpoints[5][7] = new Array(-100,-50,410,80);
      this.greendudiestartingpoints[5][8] = new Array(-150,-50,340,130);
      this.greendudiestartingpoints[5][9] = new Array(-50,100,280,165);
      this.greendudiestartingpoints[5][10] = new Array(-50,150,230,200);
      this.greendudiestartingpoints[5][11] = new Array(-50,100,180,250);
      _loc4_ = 0;
      while(_loc4_ < this.greendudiestartingpoints[5].length)
      {
         if(_loc4_ < 6)
         {
            this.greendudiestartingpoints[5][_loc4_][0] = -450 - _loc4_ * 8;
            this.greendudiestartingpoints[5][_loc4_][1] = this.greendudiestartingpoints[5][_loc4_][3];
         }
         else
         {
            this.greendudiestartingpoints[5][_loc4_][0] = this.greendudiestartingpoints[5][_loc4_][2];
            this.greendudiestartingpoints[5][_loc4_][1] = -350 - _loc4_ * 8;
         }
         _loc4_ = _loc4_ + 1;
      }
      this.greendudiestartingpoints[6] = new Array();
      this.greendudiestartingpoints[6][0] = new Array(-20,-60,400,80);
      this.greendudiestartingpoints[6][1] = new Array(-130,-60,435,70);
      this.greendudiestartingpoints[6][2] = new Array(-130,1,435,105);
      this.greendudiestartingpoints[6][3] = new Array(-50,100,345,135);
      this.greendudiestartingpoints[6][4] = new Array(-50,150,310,175);
      this.greendudiestartingpoints[6][5] = new Array(160,-50,350,175);
      this.greendudiestartingpoints[6][6] = new Array(-150,-50,85,220);
      this.greendudiestartingpoints[6][7] = new Array(-100,-50,135,220);
      this.greendudiestartingpoints[6][8] = new Array(-150,-50,180,220);
      this.greendudiestartingpoints[6][9] = new Array(-50,100,110,260);
      this.greendudiestartingpoints[6][10] = new Array(-50,150,155,260);
      this.greendudiestartingpoints[6][11] = new Array(-50,100,125,290);
      _loc4_ = 0;
      while(_loc4_ < this.greendudiestartingpoints[4].length)
      {
         if(_loc4_ < 3)
         {
            this.greendudiestartingpoints[6][_loc4_][0] = this.greendudiestartingpoints[6][_loc4_][2];
            this.greendudiestartingpoints[6][_loc4_][1] = -250;
         }
         else if(_loc4_ < 6)
         {
            this.greendudiestartingpoints[6][_loc4_][0] = this.greendudiestartingpoints[6][_loc4_][2];
            this.greendudiestartingpoints[6][_loc4_][1] = -350;
         }
         else
         {
            this.greendudiestartingpoints[6][_loc4_][0] = this.greendudiestartingpoints[6][_loc4_][2] - 400;
            this.greendudiestartingpoints[6][_loc4_][1] = this.greendudiestartingpoints[6][_loc4_][3] - 200;
         }
         _loc4_ = _loc4_ + 1;
      }
      this.greendudiestartingpoints[7] = new Array();
      this.greendudiestartingpoints[7][0] = new Array(-20,-60,400,80);
      this.greendudiestartingpoints[7][1] = new Array(-130,-60,435,70);
      this.greendudiestartingpoints[7][2] = new Array(-130,1,435,105);
      this.greendudiestartingpoints[7][3] = new Array(-50,100,345,135);
      this.greendudiestartingpoints[7][4] = new Array(-50,150,310,175);
      this.greendudiestartingpoints[7][5] = new Array(160,-50,350,175);
      this.greendudiestartingpoints[7][6] = new Array(-150,-50,85,220);
      this.greendudiestartingpoints[7][7] = new Array(-100,-50,135,220);
      this.greendudiestartingpoints[7][8] = new Array(-150,-50,180,220);
      this.greendudiestartingpoints[7][9] = new Array(-50,100,110,260);
      this.greendudiestartingpoints[7][10] = new Array(-50,150,155,260);
      this.greendudiestartingpoints[7][11] = new Array(-50,100,125,290);
      _loc4_ = 0;
      while(_loc4_ < this.greendudiestartingpoints[4].length)
      {
         if(_loc4_ < 6)
         {
            this.greendudiestartingpoints[7][_loc4_][2] = this.greendudiestartingpoints[7][_loc4_ + 6][2] + 150;
            this.greendudiestartingpoints[7][_loc4_][3] = this.greendudiestartingpoints[7][_loc4_ + 6][3] - 150;
         }
         this.greendudiestartingpoints[7][_loc4_][0] = this.greendudiestartingpoints[7][_loc4_][2] - 400;
         this.greendudiestartingpoints[7][_loc4_][1] = this.greendudiestartingpoints[7][_loc4_][3] - 200;
         _loc4_ = _loc4_ + 1;
      }
      this.greendudiestartingpoints[8] = new Array();
      _loc4_ = 0;
      while(_loc4_ < 50)
      {
         this.greendudiestartingpoints[8].push(new Array(-50,100,50 + Math.random() * 200,50 + Math.random() * 200));
         _loc4_ = _loc4_ + 1;
      }
      _loc4_ = 0;
      while(_loc4_ < this.greendudiestartingpoints[4].length)
      {
         if(_loc4_ < 10)
         {
            this.greendudiestartingpoints[8][_loc4_][0] = this.greendudiestartingpoints[8][_loc4_][2] - 400;
            this.greendudiestartingpoints[8][_loc4_][1] = this.greendudiestartingpoints[8][_loc4_][3] - 200;
         }
         else
         {
            this.greendudiestartingpoints[8][_loc4_][0] = this.greendudiestartingpoints[8][_loc4_][2] - 400;
            this.greendudiestartingpoints[8][_loc4_][1] = this.greendudiestartingpoints[8][_loc4_][3];
         }
         _loc4_ = _loc4_ + 1;
      }
      this.reset();
      mx.events.EventDispatcher.initialize(this);
   }
   function keydown(k)
   {
      if(k == 16)
      {
         this.shiftdown = true;
      }
   }
   function keyup(k)
   {
      if(k == 16)
      {
         this.shiftdown = false;
      }
   }
   function dolevel(level)
   {
      this.clearbetweenlevels();
      this.lev = level;
      if(level == 1)
      {
         this.titles.gotoAndPlay("seasonsgreetings");
      }
      else
      {
         this.titles.lev = level;
         this.titles.gotoAndPlay("levelx");
      }
      var _loc6_;
      _loc6_ = new com.iconnicholson.onehammer.RedSnowDudie(this.stage,this.sounds);
      _loc6_.addEventListener("throwball",this);
      this.adudies.push(_loc6_);
      _loc6_.setwalkendx(this.reddudie1startx);
      _loc6_.setwalkendy(this.reddudie1starty);
      _loc6_.setposition(this.reddudie1startx + 200,this.reddudie1starty + 100);
      _loc6_ = new com.iconnicholson.onehammer.RedSnowDudie(this.stage,this.sounds);
      _loc6_.addEventListener("throwball",this);
      this.adudies.push(_loc6_);
      _loc6_.setwalkendx(this.reddudie2startx);
      _loc6_.setwalkendy(this.reddudie2starty);
      _loc6_.setposition(this.reddudie2startx + 200,this.reddudie2starty + 100);
      _loc6_ = new com.iconnicholson.onehammer.RedSnowDudie(this.stage,this.sounds);
      _loc6_.addEventListener("throwball",this);
      this.adudies.push(_loc6_);
      _loc6_.setwalkendx(this.reddudie3startx);
      _loc6_.setwalkendy(this.reddudie3starty);
      _loc6_.setposition(this.reddudie3startx + 200,this.reddudie3starty + 100);
      trace("level: " + level);
      var _loc2_;
      var _loc5_ = 0;
      var _loc3_;
      while(_loc5_ < this.greendudiestartingpoints[level - 1].length)
      {
         _loc3_ = this.greendudiestartingpoints[level - 1][_loc5_];
         _loc2_ = new com.iconnicholson.onehammer.GreenSnowDudie(this.stage,this.sounds,this.titles);
         this.adudies.push(_loc2_);
         _loc2_.addEventListener("throwball",this);
         _loc2_.setposition(_loc3_[0],_loc3_[1]);
         _loc2_.setwalkendx(_loc3_[2]);
         _loc2_.setwalkendy(_loc3_[3]);
         if(level == 5 || level > 6)
         {
            _loc2_.setwalkspeed(10);
         }
         if(level == 6)
         {
            _loc2_.setwalkspeed(15);
         }
         _loc5_ = _loc5_ + 1;
      }
   }
   function throwball(eventObject)
   {
      var _loc3_ = new com.iconnicholson.onehammer.SnowBall(this.stage,this.sounds,eventObject.team,eventObject.force,eventObject.x,eventObject.y,eventObject.ineffective);
      this.snowballs.push(_loc3_);
   }
   function frameloop()
   {
      var _loc9_ = true;
      var _loc3_ = 0;
      var _loc4_;
      while(_loc3_ < this.adudies.length)
      {
         if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.GreenSnowDudie)
         {
            _loc4_ = this.adudies[_loc3_];
            if(!_loc4_.dead)
            {
               _loc9_ = false;
               break;
            }
         }
         _loc3_ = _loc3_ + 1;
      }
      if(_loc9_ && !this.gameover)
      {
         if(this.lev == this.greendudiestartingpoints.length)
         {
            this.ongameover(true);
         }
         else
         {
            this.dolevel(this.lev + 1);
         }
      }
      var _loc10_ = true;
      _loc3_ = 0;
      var _loc5_;
      while(_loc3_ < this.adudies.length)
      {
         if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.RedSnowDudie)
         {
            _loc5_ = this.adudies[_loc3_];
            if(!_loc5_.dead)
            {
               _loc10_ = false;
               break;
            }
         }
         _loc3_ = _loc3_ + 1;
      }
      if(_loc10_)
      {
         if(!this.gameover)
         {
            _loc3_ = 0;
            while(_loc3_ < this.adudies.length)
            {
               if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.GreenSnowDudie)
               {
                  _loc4_ = this.adudies[_loc3_];
                  if(!_loc4_.dead)
                  {
                     _loc4_.gameover();
                  }
               }
               _loc3_ = _loc3_ + 1;
            }
            this.ongameover();
         }
      }
      var _loc7_ = new Array();
      var _loc6_ = 0;
      var _loc2_;
      while(_loc6_ < this.snowballs.length)
      {
         _loc2_ = this.snowballs[_loc6_];
         _loc3_ = 0;
         while(_loc3_ < this.adudies.length)
         {
            if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.GreenSnowDudie)
            {
               _loc4_ = this.adudies[_loc3_];
               if(_loc2_.team == "red" && Math.abs(_loc2_.ballmc._x - _loc4_.dudiemc._x) < 30 && Math.abs(_loc2_.ballmc._y - (_loc4_.dudiemc._y - 20)) < 30 && !_loc4_.dead && !_loc4_.down && !_loc2_.dead && !_loc2_.ineffective)
               {
                  _loc2_.dead = true;
                  this.score += 10;
                  _loc4_.yougothit();
               }
            }
            else if(this.adudies[_loc3_] instanceof com.iconnicholson.onehammer.RedSnowDudie)
            {
               _loc5_ = this.adudies[_loc3_];
               if(_loc2_.team == "green" && Math.abs(_loc2_.ballmc._x - _loc5_.dudiemc._x) < 30 && Math.abs(_loc2_.ballmc._y - (_loc5_.dudiemc._y - 20)) < 30 && !_loc5_.dead && !_loc2_.dead && !_loc2_.ineffective)
               {
                  _loc2_.dead = true;
                  _loc5_.yougothit();
               }
            }
            _loc3_ = _loc3_ + 1;
         }
         if(Math.abs(_loc2_.ballmc._x) > 2999 || Math.abs(_loc2_.ballmc._y) > 2999 || _loc2_.dead)
         {
            _loc7_.push(_loc6_);
         }
         else
         {
            _loc2_.frameloop();
         }
         _loc6_ = _loc6_ + 1;
      }
      _loc6_ = 0;
      var _loc8_;
      while(_loc6_ < this.adudies.length)
      {
         _loc8_ = this.adudies[_loc6_];
         _loc8_.frameloop();
         _loc6_ = _loc6_ + 1;
      }
      _loc6_ = 0;
      while(_loc6_ < _loc7_.length)
      {
         this.snowballs[_loc7_[_loc6_]].destroy();
         this.snowballs.splice(_loc7_[_loc6_],1);
         _loc6_ = _loc6_ + 1;
      }
   }
   function ongameover(win)
   {
      var _loc3_ = new Date();
      var _loc2_ = _loc3_.getTime() - this.starttime.getTime();
      if(win)
      {
         if(_loc2_ < 1800000)
         {
            this.score += Math.round((1800000 - _loc2_) / 1000);
         }
      }
      this.gameover = true;
      this.titles.score = this.score;
      if(win)
      {
         this.titles.gotoAndPlay("gameoverwin");
      }
      else
      {
         this.titles.gotoAndPlay("gameoverlose");
      }
      var _loc4_ = {target:this,type:"gameover"};
      this.dispatchEvent(_loc4_);
   }
   function clearbetweenlevels()
   {
      var _loc2_ = 0;
      while(_loc2_ < this.adudies.length)
      {
         this.adudies[_loc2_].destroy();
         _loc2_ = _loc2_ + 1;
      }
      this.adudies = new Array();
   }
   function reset()
   {
      this.starttime = new Date();
      this.titles._visible = false;
      this.gameover = false;
      this.score = 0;
   }
}
