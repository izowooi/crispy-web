class com.iconnicholson.onehammer.SnowBall
{
   var ballmc;
   var force;
   var originalx;
   var originaly;
   var shadowmc;
   var shadowxmov;
   var shadowymov;
   var sounds;
   var stage;
   var team;
   var xmov;
   var ymov;
   var dead = false;
   var ineffective = false;
   var grounddistance = 35;
   function SnowBall(stage, sounds, team, force, x, y, ineffective)
   {
      this.stage = stage;
      this.sounds = sounds;
      this.team = team;
      this.force = force;
      if(ineffective)
      {
         this.ineffective = ineffective;
      }
      trace(this.ineffective);
      if(!_root.shadowiter)
      {
         _root.shadowiter = 550;
      }
      _root.shadowiter = _root.shadowiter + 1;
      this.shadowmc = stage.attachMovie("snowballshadow","snowballshadow" + _root.shadowiter,_root.shadowiter);
      this.shadowmc.hackparent = this;
      _root.comiter = _root.comiter + 1;
      this.ballmc = stage.attachMovie("snowball","snowball" + _root.comiter,_root.comiter);
      this.ballmc.hackparent = this;
      this.ballmc._x = this.originalx = x;
      this.ballmc._y = this.originaly = y;
      this.shadowmc._x = x;
      this.shadowmc._y = y + 35;
      if(this.team == "red")
      {
         this.xmov = this.shadowxmov = -20;
         this.ymov = this.shadowymov = -10;
      }
      else if(this.team == "green")
      {
         this.xmov = this.shadowxmov = 20;
         this.ymov = this.shadowymov = 10;
      }
      if(this.force >= 1)
      {
         this.sounds.gotoAndPlay("longthrow");
      }
      else
      {
         this.sounds.gotoAndPlay("throw");
      }
   }
   function destroy()
   {
      this.ballmc.removeMovieClip();
      this.shadowmc.removeMovieClip();
   }
   function frameloop()
   {
      if(this.dead)
      {
         return undefined;
      }
      if(this.team == "red")
      {
         if(this.ymov > -3)
         {
            this.ineffective = true;
         }
         if(this.ymov > -2 && this.ymov < 50)
         {
            this.ymov = 51;
            this.ballmc._visible = false;
            this.shadowmc.gotoAndPlay("land");
            this.sounds.gotoAndPlay("splat");
            return undefined;
         }
         if(this.ymov > 50)
         {
            this.ymov += 1;
            if(this.ymov > 100)
            {
               this.dead = true;
            }
            return undefined;
         }
         if(this.force != 1 && this.originalx - this.ballmc._x > this.force * 100)
         {
            this.ymov += 3 - this.force;
            this.force -= this.force * 0.15;
         }
      }
      else if(this.team == "green")
      {
         if(this.ymov > 17)
         {
            this.ineffective = true;
         }
         if(this.ymov > 18 && this.ymov < 50)
         {
            this.ymov = 51;
            this.ballmc._visible = false;
            this.shadowmc.gotoAndPlay("land");
            return undefined;
         }
         if(this.ymov > 50)
         {
            this.ymov += 1;
            if(this.ymov > 100)
            {
               this.dead = true;
            }
            return undefined;
         }
         if(this.force < 1 && Math.abs(this.originalx - this.ballmc._x) > this.force * 300)
         {
            this.ymov += 2 - this.force;
            this.force -= this.force * 0.15;
         }
      }
      this.ballmc._x += this.xmov;
      this.ballmc._y += this.ymov;
      this.shadowmc._x += this.shadowxmov;
      this.shadowmc._y += this.shadowymov;
   }
}
