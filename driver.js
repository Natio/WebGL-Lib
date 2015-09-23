var race = {
  tools: null,
  animator: null,
  animation: null,
  my_taxi: null,
  position: "left"
};


$(document).ready(function(){

  var canvas = document.getElementById("glcanvas");
  var gl_context =canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  race.tools = new CTTools(gl_context);
  race.tools.readyForUse(function(){
    configureTools();
  });
});

function configureTools(){

  race.animator = new CTAnimator(race.tools);
  var txts = ["street4_0", "street4_1","street4_2","street4_3","street4_4","street4_5","street4_6","street4_7"];
  for(var i in txts){
    txts[i] = "animated_textures/"+txts[i]+".gif";
  }
  txts.reverse();
  document.getElementById('message').innerHTML = "Loading Textures";
  race.tools.createAnimatedTexture(txts, 60, "street", race.animator, function(textureName){
    document.getElementById('message').innerHTML = "Loading Objects";
    race.tools.loadShapeFromOBJFile("alfa", "models/alfa147.obj", function(shape){
      crazyTaziWorld();
    });
  });
}

/**
  Builds the scene
*/

function crazyTaziWorld(){
  var animator = race.animator;
  var scene = race.tools.scene;
  var street = buildStreet();
  var car = buildCarAlfa(1);
  race.my_taxi = buildMyCarAlfa();
  scene.addObject(street);

  var sun = race.tools.createLight("directional");
  sun.direction = [5.0,10.0,10.0];
  sun.color = [0.4,0.4,0.4,1.0];
  //var sun_animation_go = new CTDirectionAnimation(sun, [-30.0,-5.0,0.0], 8000);
  //var sun_animation_back = new CTDirectionAnimation(sun, [30.0,5.0,0.0], 8000);
  //race.animator.addAnimation(new CTStackAnimation([sun_animation_go, sun_animation_back], true));


  street.addChild(car);
  street.addChild(race.my_taxi);

  //left lamp
  var lamp = buildStreetLamp();
  var lamp_translation = new CTTranslationAnimation(lamp, [-2.0,-40.0,0.0], 1700);
  var lamp_back = new CTTranslationAnimation(lamp, [2.0,40.0,0.0], 1);
  var lamp_cycle = new CTStackAnimation([lamp_translation, lamp_back], true);
  street.addChild(lamp);
  animator.addAnimation(lamp_cycle);

  //right lamp

  var lamp2 = buildStreetLamp();
  lamp2.translate[0] = 0.4;
  lamp2.axisRotation[1] = Math.PI;
  var lamp2_translation = new CTTranslationAnimation(lamp2, [2.0,-40.0,0.0], 1700);
  var lamp2_back = new CTTranslationAnimation(lamp2, [-2.0,40.0,0.0], 1);
  var lamp2_cycle = new CTStackAnimation([lamp2_translation, lamp2_back], true);
  street.addChild(lamp2);
  animator.addAnimation(lamp2_cycle);



  bindKeysToAnimations();

  setTimeout(function(){
    var c2 = buildCarAlfa(-1);
    street.addChild(c2);
    animator.addAnimation(buildCarAnimation(c2, -1));
  },1050);
  animator.addAnimation(buildCarAnimation(car,1));


  animator.startAnimation();
  //animator.debugAnimation(1000/60,1000/60);

}

/**
 * Movers player's car to the left
 */
function animateLeft(){
  if(race.animation != null || race.position == "left"){
    return;
  }

  race.position = "left"
  var left = new CTTranslationAnimation(race.my_taxi, [-1.2,0.0,0.0], 600);
  race.animation = left;
  left.onEnd = function(){
    race.position = "left";
    race.animation = null;
  };
  race.animator.addAnimation(left);
}

/**
 * Movers player's car to the right
 */
function animateRight(){
  if(race.animation != null || race.position == "right"){
    return;
  }
  race.position = "right"
  var right = new CTTranslationAnimation(race.my_taxi, [1.2,0.0,0.0], 600);
  race.animation = right;
  right.onEnd = function(){
    race.position = "right";
    race.animation = null;
  };
  race.animator.addAnimation(right);
}

/**
 * Makes car jump
 */

function jump(){
  if(race.animation != null || race.position == "up"){
    return;
  }
  var old_position = race.position;
  race.position = "up";
  var jump_animation = jumpAnimation(race.my_taxi)
  jump_animation.onEnd = function(){
    race.position = old_position;
    race.animation = null;
  };
  race.animation = jump_animation;
  race.animator.addAnimation(jump_animation);
}


/**
  Controls' handler
*/
function bindKeysToAnimations(){
  $(document).keydown(function(e) {
    switch(e.which) {
      case 65: // left
      animateLeft();
      break;

      case 87: // up
      jump();
      break;

      case 68: // right
      animateRight();
      break;

      default: return; // exit this handler for other keys
    }
    e.preventDefault(); // prevent the default action (scroll / move caret)
  });
}


/**
  Builds a street lamp
*/
function buildStreetLamp(){
  var body = new CTObject(race.tools.shapes.cube);
  body.color = [0.5, 0.5, 0.5,1.0];
  body.scale = [0.2,4.0,0.2];
  body.axisRotation[0] = Math.PI/2.0;
  body.translate[2] = 0.4;
  body.translate[1] = 20;
  body.translate[0] = -0.4;
  body.totalScale = [0.3, 0.3, 0.3];

  var top = new CTObject(race.tools.shapes.cube);
  top.color = body.color;
  top.scale = [1.2,0.2,0.2];
  top.translate[1] = 2.0;
  top.translate[0] = 0.5;
  body.addChild(top);


  var lamp = new CTObject(race.tools.shapes.sphere);
  lamp.scale = [0.2,0.2,0.2];
  lamp.translate[0] = 0.5;
  var pos = race.tools.createLight("positional");
  lamp.addLight(pos);
  top.addChild(lamp);

  return body;
}




/**
  Builds player car
*/
function buildMyCarAlfa(){


  var car = new CTObject(race.tools.shapes.alfa);
  //new_shape.axisRotation[0] = -Math.PI/2;
  car.color = [1.0,0.0,0.0,1.0];
  //new_shape.axisRotation[0] = Math.PI/2;
  car.axisRotation[2] = Math.PI;
  car.translate[0] = -0.6;
  car.translate[1] = -15.2;

  car.totalScale = [0.005,0.005,0.005];

  var light = race.tools.createLight("spot");
  light.direction = [0.0,1.0,-0.3];
  light.position = [0.0,-80.0,10.0];
  car.addLight(light);

  return car;
}


/**
  Builds the street object
*/
function buildStreet(){
  var street = new CTObject(race.tools.shapes.street);
  street.color = [1.0, 0.0, 0.0, 1.0];
  street.rotation[0] = -Math.PI/2 + 0.1;
  street.textureName = "street";



  var background = new CTObject(race.tools.shapes.cube);
  background.color = [0.0,1.0,0.0,1.0];
  background.translate = [-1.0,0.0, -0.4];
  background.scale = [35.0,40,0.5];

  street.addChild(background);

  race.tools.createTexture("textures/grass.png", "grass", function(name){
    background.textureName = name;
  });

  var skyline = new CTObject(race.tools.shapes.cube);
  skyline.color = [0.0,0.0,1.0,1.0];
  skyline.scale = [60.0,0.1,60.5];
  skyline.translate = [0.0,50.0,0.0];

  race.tools.createTexture("textures/sky.png", "sky", function(name){
    skyline.textureName = name;
  });

  street.addChild(skyline);
  return street;
}

/**
  Builds an "enemy" car
*/
function buildCarAlfa(lane){
  var car = new CTObject(race.tools.shapes.alfa);
  car.translate =[lane * 0.1,20.0,0.0];
  car.color = [Math.random(),Math.random(),Math.random(),1.0];
  car.totalScale = [0.005,0.005,0.005];


  var l = race.tools.createLight("spot");
  l.direction = [0.0,1.0,0.0];
  l.position = [-20.0,-80.0,8.0];
  car.addLight(l);


  var l2 = race.tools.createLight("spot");
  l2.direction = [0.0,1.0,0.0];
  l2.position = [20.0,-80.0,8.0];
  car.addLight(l2);


  return car;
}


/**
  Builds the animation of the "enemy" car
*/
function buildCarAnimation(a_car, lane){
  var y_diff = 36;
  var x_diff = lane * 0.6;
  var go = new CTTranslationAnimation(a_car, [x_diff,-y_diff,0.0], 2000);
  var back = new CTTranslationAnimation(a_car, [-x_diff, y_diff,0.0], 1);
  return new CTStackAnimation([go,back],true);
}

/**
  Function that builds the car jump aimation
  @param a_car a CTObject representing the car
  @return a CTAnimation
*/
function jumpAnimation(a_car){
  var dz = 0.7;
  var d_rad_x = Math.PI/8;
  var up = new CTTranslationAnimation(a_car, [0.0,0.0, dz], 500);
  var rotate = new CTRotationAnimation(a_car, [d_rad_x, 0.0, 0.0],500, true);
  var first_group = new CTGroupAnimation([up, rotate], false);


  var down = new CTTranslationAnimation(a_car, [0.0,0.0, -dz], 500);
  var rotate_back = new CTRotationAnimation(a_car, [-d_rad_x, 0.0, 0.0], 500, true);
  var second_group = new CTGroupAnimation([down, rotate_back], false);
  return new CTStackAnimation([first_group, second_group], false);
}

function megaR(){
  var sign = Math.random() >= 0.5 ? 1.0 : -1.0;
  return Math.random() * sign;
}
