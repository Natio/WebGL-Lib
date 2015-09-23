/**
Creates an animator instance
@param ct a CTTool instance
*/
function CTAnimator(ct){
  this.scene = ct.scene;
  this.ct = ct;
  this.animations = [];
  this.animatedTextures = [];
  this.request_id = null;
  this.timestamp = null;
  this.frameTime = 0;
  this.isDebugAnimation = false;
}

/**
Helper to simulate different FPSs
@param manual_dt fake dt to animation
@param reaal_schedule the real animation timing
*/
CTAnimator.prototype.debugAnimation = function(manual_dt, reaal_schedule){
  this.isDebugAnimation = true;
  var t = this;
  document.getElementById('message').innerHTML = "Simulating: "+(1000/manual_dt).toFixed(1)+" fps";
  this.request_id = setInterval(function(){


    t.realAnimation(manual_dt);
  }, reaal_schedule);
}


/**
Helper method to animate animations
*/
CTAnimator.prototype.realAnimation = function(dt){
  for(var index in this.animations){
    var animation = this.animations[index];
    animation.tic(dt);
    if(animation.ended){
      this.removeAnimation(animation);
    }
  }

  for(var index in this.animatedTextures){
    this.animatedTextures[index].ticTexture(dt);
  }

  this.ct.renderScene();
}

/**
  Callback of requestAnimationFrame, should not be called directly
*/
CTAnimator.prototype.animation = function(timestamp){
  this.request_id = this.requestFrame();
  if(this.timestamp == null){
    this.timestamp = timestamp;
    return;
  }
  var dt = timestamp - this.timestamp;
  if(dt > 2000) dt = 2000;//hack to resolve a bug if animations are not paused
  this.timestamp = timestamp;
  this.frameTime+= (dt - this.frameTime) / 20;

  this.realAnimation(dt);

  document.getElementById('message').innerHTML = (1000/this.frameTime).toFixed(1)+" fps";
}

/**
  Checks wheater the current animator is animating or if it is stopped
  @return true if the animator is animating
*/
CTAnimator.prototype.isAnimating = function(){
  return this.request_id != null;
}


/**
  Stops the animator
*/
CTAnimator.prototype.stopAnimation = function(){
  if(this.isDebugAnimation){
    clearInterval(this.request_id);
  }
  else{
    cancelAnimationFrame(this.request_id);
  }
  this.isDebugAnimation = false;
  this.request_id = null;
  this.timestamp = null;
  this.frameTime = 0;
}

/**
  Real animation startes
*/
CTAnimator.prototype.requestFrame = function(){
  var t = this;
  /*return requestAnimationFrame(function(dt){
    t.animation(dt);
  });*/
  return requestAnimationFrame(this.animation.bind(this));
}

/**
  Starts the animation
*/
CTAnimator.prototype.startAnimation = function(){
  this.request_id = this.requestFrame();
}

/**
  Adds an animation to the animator
*/
CTAnimator.prototype.addAnimation = function(animation){
  this.animations.push(animation);
  animation.prepareForUse();
  animation.animator = this;
}

/**
  Adds an animated texture to the animator
*/
CTAnimator.prototype.addAnimatedTexture = function(animated_texture){
  this.animatedTextures.push(animated_texture)
  animated_texture.animator = this;
}

CTAnimator.prototype.removeAnimatedTexture = function(animated_texture){
  var index = this.animatedTextures.indexOf(animated_texture);
  if(index < 0){
    throw "Trting to remove an animated texture that has not been added to this animator";
  }
  this.animatedTextures.splice(index, 1);
  animated_texture.animator = null;
}

CTAnimator.prototype.removeAnimation = function(animation){
  var index = this.animations.indexOf(animation);
  if(index < 0){
    throw "Trting to remove an animation that has not been added to this animator";
  }
  this.animations.splice(index, 1);
  animation.animator = null;
}

/**
  Base ABSTRACT class of all animations
  @param obj the object to animate
  @param the speed of the animation
  @param time_ms animation length in milliseconds
*/
function CTAnimation(obj, speed, time_ms){
  //assert(obj.constructor.name == "CTObject", "Object not provided or instance of wrong class");
  this.object = obj;
  this.onEnd = null;
  this.speed = speed;
  this.animator = null;
  this.time_ms = time_ms;
  this.ended = false;
  this.excess_ms = 0; //represents the excess in millis
  this.real_animation_time_ms = 0;
}

/**
  Helper function that checks if an animation has reached its and
*/
CTAnimation.checkEndValues = function(current, end_values, speed){
  var ended = true;
  if(speed[0] > 0){
    ended = ended && end_values[0] <= current[0];
  }
  else{
    ended = ended && end_values[0] >= current[0];
  }

  if(speed[1] > 0){
    ended = ended && end_values[1] <= current[1];
  }
  else{
    ended = ended && end_values[1] >= current[1];
  }
  if(ended == false) return false;

  if(speed[2] > 0){
    ended = ended && end_values[2] <= current[2];
  }
  else{
    ended = ended && end_values[2] >= current[2];
  }

  return ended;
}

/**
  Prepares the animation for reuse
*/
CTAnimation.prototype.prepareSuperForUse = function(){
  this.excess_ms = 0; //represents the excess in millis
  this.real_animation_time_ms = 0;
  this.ended = false;
}
/**
  Abstract mathod. Prepares the animation for reuse
*/
CTAnimation.prototype.prepareForUse = function(){
  throw "Cannot use CTAnimation.prepareForUse(). CTAnimation is abstract";
}

/**
  Abstract mathod. This method is called by the animator to make the animation advance of one step
*/
CTAnimation.prototype.tic =function(dt){
  throw "Cannot use CTAnimation to animate. CTAnimation is abstract";
}

/**
  Called by the animator when the animation ends
*/
CTAnimation.prototype.animationEnded = function(){
  this.excess_ms = this.real_animation_time_ms - this.time_ms;
  if(isNaN(this.excess_ms)){
    this.excess_ms = 0;
  }

  this.ended = true;
  if(this.onEnd){
    this.onEnd();
  }
}

/**
  * CTAnimation subclass that handles trasnlation
  * @param obj the object to animate
  * @param angles array of angles increment
  * @param time_ms the animation length in milliseconds
  * @param aroundSelf if true the rotation is done around the object axis
*/
function CTRotationAnimation(obj, angles, time_ms, aroundSelf){

  CTAnimation.call(this,obj, null, time_ms);

  this.aroundSelf = aroundSelf;
  this.angles = angles;

}

CTRotationAnimation.prototype = Object.create(CTAnimation.prototype);

CTRotationAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  var aX = this.angles[0] / this.time_ms;
  var aY = this.angles[1] / this.time_ms;
  var aZ = this.angles[2] / this.time_ms;
  this.speed = [aX, aY, aZ];
  var rotation = this.aroundSelf ? this.object.axisRotation : this.object.rotation;

  this.end_values = [ rotation[0] + this.angles[0],
                      rotation[1] + this.angles[1],
                      rotation[2] + this.angles[2]];

}

CTRotationAnimation.prototype.tic = function(dt){
  this.real_animation_time_ms += dt;
  var incrementX = this.speed[0] * dt;
  var incrementY = this.speed[1] * dt;
  var incrementZ = this.speed[2] * dt;

  var rotation = this.aroundSelf ? this.object.axisRotation : this.object.rotation;
  rotation = [rotation[0] + incrementX, rotation[1] + incrementY, rotation[2] + incrementZ,];

  if(this.aroundSelf){
    this.object.axisRotation = rotation;

  }
  else{
    this.object.rotation = rotation;
  }
  if(CTAnimation.checkEndValues(rotation, this.end_values, this.speed)){
    if(this.aroundSelf){
      this.object.axisRotation = this.end_values.slice();

    }
    else{
      this.object.rotation = this.end_values.slice();
    }
    this.animationEnded();
  }
}





/**
  Animates the scale or totalScale property of a CTObject
  @param object the object to animate (CTObject)
  @param amount the wanted translation. It must be an array
  @param time_ms animation length in milliseconds
*/
function CTTranslationAnimation(obj, amount, time_ms){

  CTAnimation.call(this, obj, null, time_ms);
  this.amount = amount;
}

CTTranslationAnimation.prototype = Object.create(CTAnimation.prototype);

CTTranslationAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  var sX = this.amount[0] / this.time_ms;
  var sY = this.amount[1] / this.time_ms;
  var sZ = this.amount[2] / this.time_ms;
  this.speed = [sX, sY, sZ];
  this.end_values = [this.object.translate[0] + this.amount[0],
                     this.object.translate[1] + this.amount[1],
                     this.object.translate[2] + this.amount[2]];
}

CTTranslationAnimation.prototype.tic = function(dt){
  this.real_animation_time_ms += dt;
  this.object.translate[0] += this.speed[0] * dt;
  this.object.translate[1] += this.speed[1] * dt;
  this.object.translate[2] += this.speed[2] * dt;

  if(CTAnimation.checkEndValues(this.object.translate, this.end_values, this.speed)){
      this.object.translate = this.end_values.slice();
      this.animationEnded();
  }

}

/**
  Animates the scale or totalScale property of a CTObject
  @param object the object to animate (CTObject)
  @param end_scale the wanted scale
  @param time_ms animation length in milliseconds
  @param total if true the totalScale property will be animated
*/
function CTScaleAnimation(object, end_scale, time_ms, total){
  CTAnimation.call(this, object, null, time_ms);
  this.amount = end_scale;
  this.total = total;
}

CTScaleAnimation.prototype = Object.create(CTAnimation.prototype);


CTScaleAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  var current = this.total ? this.object.totalScale : this.object.scale;
  var sX = this.amount[0] / this.time_ms;
  var sY = this.amount[1] / this.time_ms;
  var sZ = this.amount[2] / this.time_ms;
  this.speed = [sX, sY, sZ];
  this.end_values = [current[0] + this.amount[0],
                     current[1] + this.amount[1],
                     current[2] + this.amount[2]];
}


CTScaleAnimation.prototype.tic = function(dt){
  this.real_animation_time_ms += dt;
  var current = this.total ? this.object.totalScale : this.object.scale;
  current[0] += this.speed[0] * dt;
  current[1] += this.speed[1] * dt;
  current[2] += this.speed[2] * dt;


  if(CTAnimation.checkEndValues(current, this.end_values, this.speed)){
    current = this.end_values.slice();
    this.animationEnded();
  }

}


function CTDirectionAnimation(light, direction, time_ms){
  CTAnimation.call(this, light, null, time_ms);
  this.amount = direction;
}

CTDirectionAnimation.prototype = Object.create(CTAnimation.prototype);

CTDirectionAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  var current = this.object.direction;
  var pX = this.amount[0] / this.time_ms;
  var pY = this.amount[1] / this.time_ms;
  var pZ = this.amount[2] / this.time_ms;
  this.speed = [pX, pY, pZ];
  this.end_values = [current[0] + this.amount[0],
                     current[1] + this.amount[1],
                     current[2] + this.amount[2]];
}


CTDirectionAnimation.prototype.tic = function(dt){
  this.real_animation_time_ms += dt;
  var current = this.object.direction;
  current[0] += this.speed[0] * dt;
  current[1] += this.speed[1] * dt;
  current[2] += this.speed[2] * dt;


  if(CTAnimation.checkEndValues(current, this.end_values, this.speed)){
    current = this.end_values.slice();
    this.animationEnded();
  }
  console.log(current);
}


/**
  Animates the color property of a CTObject or of a GLLight
  @param object the object to animate (CTObject or GLLight)
  @param end_color the wanted color
  @param time_ms animation length in milliseconds
*/

function CTColorAnimation(object, end_color, time_ms){
  CTAnimation.call(this, object, null, time_ms);
  this.end_values = end_color;
}



CTColorAnimation.prototype = Object.create(CTAnimation.prototype);

CTColorAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  var current = this.object.color;
  var r = (this.end_values[0] - current[0])/this.time_ms;
  var g = (this.end_values[1] - current[1])/this.time_ms;
  var b = (this.end_values[2] - current[2])/this.time_ms;
  this.speed = [r,g,b];
}

CTColorAnimation.prototype.tic = function(dt){
  this.real_animation_time_ms += dt;
  var r = this.speed[0] * dt;
  var g = this.speed[1] * dt;
  var b = this.speed[2] * dt;

  this.object.color[0] += r;
  this.object.color[1] += g;
  this.object.color[2] += b;

  if(CTAnimation.checkEndValues(this.object.color, this.end_values, this.speed)){
    this.object.color = this.end_values.slice(0);
    this.animationEnded();
  }

}

/**
 Stack animation executes animation in a FIFO order.
 @param animamations array of animations
 @param repeat if the animations shoud start from beginning once they are finished
*/
function CTStackAnimation(animations, repeat){
  CTAnimation.call(this);
  this.animations = animations;
  this.currentAnimationIndex = 0;
  this.repeat = repeat;
  this.last_animation_time_excess = 0;
}

CTStackAnimation.prototype = Object.create(CTAnimation.prototype);

CTStackAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  this.last_animation_time_excess = this.repeat ? this.last_animation_time_excess : 0;
  this.scheduleAnimationAtIndex(0);
}

CTStackAnimation.prototype.tic = function(dt){
  this.real_animation_time_ms += dt;
  var current = this.animations[this.currentAnimationIndex];
  current.tic(dt + this.last_animation_time_excess);
  if(current.ended){
    this.last_animation_time_excess = current.excess_ms;
    this.currentAnimationFinished();
  }
  else{
    this.last_animation_time_excess = 0;
  }
}


CTStackAnimation.prototype.currentAnimationFinished = function(){
  if((this.currentAnimationIndex+1) >= this.animations.length){
    if(this.repeat){
      this.prepareForUse();
    }
    else{
      this.animationEnded();
    }
  }
  else{
    this.scheduleAnimationAtIndex(this.currentAnimationIndex + 1);
  }
}

CTStackAnimation.prototype.scheduleAnimationAtIndex = function(index){
  this.currentAnimationIndex = index;
  var current = this.animations[this.currentAnimationIndex];
  current.prepareForUse();
}


/**
 A group animation is a set of animations that are executed togheter.
 If an animation finishes it will be removed and other animations will continue to be scheduled
 @param animations array of CTAnimation subclasses
 @param repeat a boolean that indicates if the group should restart when it ends
*/

function CTGroupAnimation(animations, repeat){
  CTAnimation.call(this, null, null, 0);
  this.repeat = repeat;
  this.animations = animations;
}


CTGroupAnimation.prototype = Object.create(CTAnimation.prototype);


CTGroupAnimation.prototype.prepareForUse = function(){
  this.prepareSuperForUse();
  for(var i in this.animations){
    var animation = this.animations[i];
    animation.prepareForUse();
  }
}

CTGroupAnimation.prototype.tic = function(dt){
  var excess_time = 0;
  this.real_animation_time_ms += dt;
  var ended_animations = 0;
  for(var i in this.animations){
    var current_animation = this.animations[i];
    if(current_animation.ended === false){
      current_animation.tic(dt);
      excess_time = Math.max(current_animation.excess_ms, excess_time);
    }
    else{
      ended_animations += 1;
    }
  }

  if(this.animations.length == ended_animations){
    if(this.repeat){
      this.prepareForUse();
    }
    else{
      this.animationEnded();
      this.excess_ms = excess_time;
    }
  }
}
