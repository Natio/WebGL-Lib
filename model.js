
/**
  Object that represents a scene to draw. A scene is a collection of objects.
  Only root objects must be added to a scene. If you have a complex object hierarchy
  add only the root object to the scene
*/
function CTScene(){
  this.objects = [];
}

/**
  Adds an object to the scene
  @param obj the object to add
*/
CTScene.prototype.addObject = function(obj){
  assert(obj != null && obj.constructor.name == "CTObject", "Object not provided or instance of wrong class");
  this.objects.push(obj);
}


/**** Lights ******/

/**
* The following function creates a light, sould not be called directly,
  @param ct a CTTool instance
*/
function GLLight(ct){
  this.direction = [0.0,0.0,0.0];
  this.position = [0.0,0.0,0.0];
  this.color = [1.0, 1.0, 1.0, 1.0];
  this.enabled = true;
  this.here = {
    position: this.position,
    direction: this.direction
  };
  this.ct = ct;
}

/**
  Removes the current light to the CTTools that created it
*/
GLLight.prototype.remove = function(){
  this.ct.deleteLight(this);
}

/**
  Places the light in the current "transformation" of the modelview matrix
*/
GLLight.prototype.placeHere = function(gt){
  var pos = vec3.create();
  vec3.transformMat4(pos, this.position, gt.modelview);

  var dir = vec3.create();
  var modelN = mat3.create();
  mat3.normalFromMat4(modelN, gt.modelview);
  vec3.transformMat3(dir, this.direction, modelN);
  this.here = {
    position: pos,
    direction: dir
  };
}


/**
  An object that represents a shape. Shapes are collection of vertices.
  Shapes are ment to be assigned to CTObjects
  @param ct a CTTools instance
  @param modelData model object used as source it must contain
                  [vertexPositions,vertexNormals,indices,vertexTextureCoords] properties
  @param name name of the shape (used for retrieving the shape tools.shapes[name])
*/
function CTShape(ct, modelData, name){

  this.name = name;
  this.ct = ct;
  this.coordsBuffer = ct.gl.createBuffer();
  this.normalBuffer = ct.gl.createBuffer();
  this.indexBuffer = ct.gl.createBuffer();
  this.texBuffer = ct.gl.createBuffer();
  this.count = modelData.indices.length;

  ct.gl.bindBuffer(ct.gl.ARRAY_BUFFER, this.coordsBuffer);
  ct.gl.bufferData(ct.gl.ARRAY_BUFFER, modelData.vertexPositions, ct.gl.STATIC_DRAW);

  ct.gl.bindBuffer(ct.gl.ARRAY_BUFFER, this.normalBuffer);
  ct.gl.bufferData(ct.gl.ARRAY_BUFFER, modelData.vertexNormals, ct.gl.STATIC_DRAW);

  ct.gl.bindBuffer(ct.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  ct.gl.bufferData(ct.gl.ELEMENT_ARRAY_BUFFER, modelData.indices, ct.gl.STATIC_DRAW);

  ct.gl.bindBuffer(ct.gl.ARRAY_BUFFER, this.texBuffer);
  ct.gl.bufferData(ct.gl.ARRAY_BUFFER, modelData.vertexTextureCoords, ct.gl.STATIC_DRAW);
}

/**
  A CTObject is the class used for modeling a complex object. Using its property it is possible to transform
  a shape and to create complex object hierarchies.

  Animable Properties

  this.translate = translate the object and its children
  this.scale = sclaes only the current object and not its children
  this.totalScale = sclae the current object and its children
  this.rotation = rotate the object (and its children) around main axes
  this.axisRotation = rotate the object (and its children) around current object axis
  this.color = current object color

  @param shape the shape to use
*/
function CTObject(shape){
  assert(shape != null && shape.constructor.name == "CTShape", "Shape not provided or instance of wrong class");
  this.translate = [0.0, 0.0, 0.0];
  this.scale = [1.0, 1.0, 1.0];
  this.totalScale = [1.0, 1.0, 1.0]; //scales the current object and children
  this.rotation = [0.0, 0.0, 0.0]; //rotates around main axis
  this.axisRotation = [0.0, 0.0, 0.0]; //rotate around object's axis
  this.color = [1.0,1.0,1.0,1.0]; //color of the object
  this.chilrend = []; //cigldren of this object
  this.shape = shape; //the shape to draw
  this.root = null;
  this.lights = [];
  this.textureName = null;
  this.customDrawing;
  this.ct = null;
}

/**
  Adds a light to the object. Light direction shoud be set accordingly to object orientation
  @param light the light to add
*/
CTObject.prototype.addLight = function(light){
  assert(light != null && light.constructor.name == "GLLight", "Shape not provided or instance of wrong class");
  this.lights.push(light);
}

/**
  Adds a child to current object
  @param child the child to add
*/
CTObject.prototype.addChild = function(child){
  this.chilrend.push(child);
  child.root = this;
}

/**
  Removes child
*/
CTObject.prototype.removeChild = function(child){
  var index = this.chilrend.indexOf(child);
  if(index < 0){
    throw "Invalid argument. cannot remove a child from another family";
  }
  this.chilrend.splice(index,1);
  child.root = null;
}
/**
  Removes current object from parent
*/
CTObject.prototype.removeFromParent = function(){
  this.root.removeChild(this);
}

/**
  Sets a function that can be used for performing additional drawing
*/
CTObject.prototype.setCustomDrawing = function(drawingFunction){
  this.customDrawing = drawingFunction;
}

/**
  Renders the current object
*/
CTObject.prototype.render = function(ct){
  ct.push();

  mat4.rotateX(ct.modelview, ct.modelview, this.rotation[0]);
  mat4.rotateY(ct.modelview, ct.modelview, this.rotation[1]);
  mat4.rotateZ(ct.modelview, ct.modelview, this.rotation[2]);

  mat4.translate(ct.modelview, ct.modelview, this.translate);
  mat4.scale(ct.modelview, ct.modelview, this.totalScale);

  mat4.rotateX(ct.modelview, ct.modelview, this.axisRotation[0]);
  mat4.rotateY(ct.modelview, ct.modelview, this.axisRotation[1]);
  mat4.rotateZ(ct.modelview, ct.modelview, this.axisRotation[2]);

  for(var i in this.lights){
    this.lights[i].placeHere(ct);
  }

  for(o in this.chilrend){
    this.chilrend[o].render(ct);
  }

  ct.currentColor = this.color;

  if(this.customDrawing != null){
    this.customDrawing(ct);
  }
  mat4.scale(ct.modelview, ct.modelview, this.scale);
  ct.renderModelObject(this);
  ct.pop();
}
