function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}

/**
  Creates an instance of CTTools
  @param gl the WebGL context
*/
function CTTools(gl){
  this.gl = gl;
  this.attr = {};
  this.uniforms = {};
  this.shapes = {};
  //this.complexObjects = {};

  this.textures = {};

  this.lights = {};
  this.lights.spots = [];
  this.lights.positionals = [];
  this.lights.directional = null;

  this.uniforms.directional = {};
  this.uniforms.directional.direction = vec3.create();
  this.uniforms.directional.color = vec4.create();
  this.uniforms.directional.enabled = true;

  this.uniforms.spots = {};
  this.uniforms.spots.positions = [];
  this.uniforms.spots.directions = [];
  this.uniforms.spots.colors = [];
  this.uniforms.spots.enabled = [];

  this.uniforms.positionals = {};
  this.uniforms.positionals.positions = [];
  this.uniforms.positionals.colors = [];
  this.uniforms.positionals.enabled = [];

  this.currentColor = [1.0, 1.0, 1.0, 1.0];
  this.projection = mat4.create();   // projection matrix
  this.modelview = mat4.create();    // modelview matrix
  this.normalMatrix = mat3.create(); // matrix, derived from modelview matrix, for transforming normal
  this.matrixStack = [];

  this.loadShapes();
  this.scene = new CTScene();


}

/**
  Performs addistional setup. MUST be called befor using tools
  @param callback a callback function that is called when the tools are ready to use
*/
CTTools.prototype.readyForUse = function(callback){
  var closure_this = this;
  CTTools.downloadDefaultShaders(function(vert, frag){
    closure_this.loadShaders(vert, frag);
    callback();
  });
}

/**
  Creates and returns a GLLight object
  @param type the type of light [spot, directional, positional]
  @return an instantiated GLLight
*/
CTTools.prototype.createLight = function(type){
  if(type == "spot"){
    if(this.lights.spots.length == 10){
      throw "Error: Spot lights limit reached. Cannot instanciate more than 10 spot lights";
    }
    var new_light = new GLLight(this);
    new_light.type = type;
    this.lights.spots.push(new_light);
    return new_light;
  }
  else if(type == "directional"){
    if(this.lights.directional != null){
      throw "directional light already instanciated. CTTools only supports 1 directional light";
    }
    var dir = new GLLight(this);
    dir.type = type;
    this.lights.directional = dir;
    return dir;
  }
  else if("positional"){
    if(this.lights.positionals.length == 10){
      throw "Error: Positional lights limit reached. Cannot instanciate more than 10 positional lights";
    }
    var new_pos = new GLLight(this);
    new_pos.type = type;
    this.lights.positionals.push(new_pos);
    return new_pos;
  }
  else{

    throw "Light type Not yet supported";
  }
}

/**
  Deletes a GLLight
*/
CTTools.prototype.deleteLight = function(light){
  if(light.type == "spot"){
    var index = this.lights.spots.indexOf(light);
    if(index < 0){
      throw "Trying to remove a light that has not been added";
    }
    this.lights.spots.slice(index,1);
  }
  else{
    throw "Light type Not yet supported";
  }
}

/**
  Function automatically called by the tools. It loads the default shapes
*/
CTTools.prototype.loadShapes = function(){
  this.loadShapesFromFunction(function(ct){
    ct.shapes.cube = new CTShape(ct, cube(1.0), "cube");
    ct.shapes.cone = new CTShape(ct, uvCone(1.0, 1.0, 50, true), "uvCone");
    ct.shapes.street = new CTShape(ct, street(3.5,35.0,0.5), "street");
    ct.shapes.ring = new CTShape(ct, ring(1,2, 20), "ring");
    ct.shapes.sphere = new CTShape(ct, uvSphere(1,32,16), "uvSphere");
  });
}

/**
  Loads a shape from an OBJ file.
  @param shape_name the name of the shape. it is very important because after it is possible
                    to retrieve the shape using tools.shapes[shape_name]
  @param file_url the URL where the OBJ file is
  @param callback a function that is called when the shape is loaded
*/
CTTools.prototype.loadShapeFromOBJFile = function(shape_name, file_url, callback){
  var me = this;
  $.get(file_url, function(text){

    var mesh = new OBJ.Mesh(text);
    //console.log(mesh);

    var modelData = {
      vertexPositions: new Float32Array(mesh.vertices),
      vertexNormals: new Float32Array(mesh.vertexNormals),
      vertexTextureCoords: new Float32Array(mesh.textures),
      indices: new Uint16Array(mesh.indices)
    };

    var new_shape = new CTShape(me, modelData, shape_name);
    me.shapes[shape_name] = new_shape;
    if(callback){
      callback(new_shape);
    }
  });

}

/**
  Loads one or more shapes from a function.
  @param loadFunction the function used for loading the shapes
  @see CTTools.prototype.loadShapes to see how it works
*/
CTTools.prototype.loadShapesFromFunction = function(loadFunction){
  loadFunction(this);
}


CTTools.prototype.bindVariablesToShaders = function(shaderProgram){
  //this.program = shaderProgram;
  //this.attr.aCoords = this.gl.bindAttribLocation(shaderProgram, 0 , "coords");

  this.gl.bindAttribLocation(shaderProgram, 1, "normal");
  this.gl.bindAttribLocation(shaderProgram, 2, "aTexCoord");
  this.gl.bindAttribLocation(shaderProgram, 0, "coords");
  this.gl.linkProgram(shaderProgram);
  this.attr.aNormal =  this.gl.getAttribLocation(shaderProgram, "normal");
  this.uniforms.aTexCoord = this.gl.getAttribLocation(shaderProgram, "aTexCoord");
  this.attr.aCoords=  this.gl.getAttribLocation(shaderProgram, "coords");
  this.uniforms.uModelview = this.gl.getUniformLocation(shaderProgram, "modelview");
  this.uniforms.uProjection = this.gl.getUniformLocation(shaderProgram, "projection");
  this.uniforms.uNormalMatrix =  this.gl.getUniformLocation(shaderProgram, "normalMatrix");
  this.uniforms.uColor = this.gl.getUniformLocation(shaderProgram, "uColor");
  this.uniforms.uUseTexture = this.gl.getUniformLocation(shaderProgram, "uUseTexture");
  this.uniforms.uSampler = this.gl.getUniformLocation(shaderProgram, "uSampler");

  for(var i = 0; i < 10; i++){
    this.uniforms.spots.positions[i] = this.gl.getUniformLocation(shaderProgram, "uSpotsPosition["+i+"]");
    this.uniforms.spots.directions[i] = this.gl.getUniformLocation(shaderProgram, "uSpotsDirection["+i+"]");
    this.uniforms.spots.colors[i] = this.gl.getUniformLocation(shaderProgram, "uSpotsColor["+i+"]");
    this.uniforms.spots.enabled[i] = this.gl.getUniformLocation(shaderProgram, "uSpotsEnabled["+i+"]");
  }
  this.uniforms.spots.uTotalSpots = this.gl.getUniformLocation(shaderProgram, "uTotalSpots");


  for(var i = 0; i < 10; i++){
    this.uniforms.positionals.positions[i] = this.gl.getUniformLocation(shaderProgram, "uPositionalPosition["+i+"]");
    this.uniforms.positionals.colors[i] = this.gl.getUniformLocation(shaderProgram, "uPositionalColor["+i+"]");
    this.uniforms.positionals.enabled[i] = this.gl.getUniformLocation(shaderProgram, "uPositionalEnabled["+i+"]");
  }
  this.uniforms.positionals.uTotalPositional = this.gl.getUniformLocation(shaderProgram, "uTotalPositional");

  this.uniforms.directional.direction = this.gl.getUniformLocation(shaderProgram, "uSunDirection");
  this.uniforms.directional.color = this.gl.getUniformLocation(shaderProgram, "uSunColor");
  this.uniforms.directional.enabled = this.gl.getUniformLocation(shaderProgram, "uShowSun");


  this.gl.enableVertexAttribArray(this.attr.aCoords);  // won't change after initialization.
  this.gl.enableVertexAttribArray(this.attr.aNormal);  // also won't change.
  this.gl.enable(this.gl.DEPTH_TEST);
}


CTTools.prototype.loadShaders = function(vertexSource, fragmentSource){
  var gl = this.gl;
  try{
    var vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh, vertexSource);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
      throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
    }
    var fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fragmentSource);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
      throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    this.bindVariablesToShaders(prog);
    //gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
      throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }

  }catch(err){
    document.getElementById("message").innerHTML =""+ err;
  }



  this.gl.useProgram(prog);
}

/**
  Renders the scene
*/
CTTools.prototype.renderScene = function(){
  this.gl.clearColor(0,0,0,1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  mat4.perspective(this.projection, Math.PI/4, 1, 3, 500);
  //mat4.perspective(this.projection, Math.PI/4, 1, 0, 50);
  //assigns to the matrix projection the transformation with frustum
  //defined by an eye angle of 45 degrees (pi/4), ratio of width/height
  // of 1, near plane 1 and far plane 50

  var eyePosition = [0, 0, 20];//Position of the viewer
  var viewCenter = [0, 0, 0];//Point the viewer is looking at
  var up = [0, 1, 0];//vec3 pointing up
  mat4.lookAt(this.modelview, eyePosition, viewCenter, up);


  this.gl.uniformMatrix4fv(this.uniforms.uProjection, false, this.projection );

  for(var c in this.scene.objects){
    this.scene.objects[c].render(this);
  }

}

/**
  Renders a single CTModelObject. This method MUST not be called directly
  @param modelObject the CTModelObject to draw
*/
CTTools.prototype.renderModelObject = function(modelObject){
  var gl = this.gl;
  //bind spots
  for(var i =0; i < this.lights.spots.length ; i++){
    var c_spot = this.lights.spots[i];
    gl.uniform3fv(this.uniforms.spots.positions[i], c_spot.here.position);
    gl.uniform3fv(this.uniforms.spots.directions[i], c_spot.here.direction);
    gl.uniform4fv(this.uniforms.spots.colors[i], c_spot.color);
    gl.uniform1i(this.uniforms.spots.enabled[i], c_spot.enabled);
  }
  gl.uniform1i(this.uniforms.spots.uTotalSpots, this.lights.spots.length);

  //bind positionals

  for(var i =0; i < this.lights.positionals.length; i++){
    var c_pos = this.lights.positionals[i];
    gl.uniform3fv(this.uniforms.positionals.positions[i], c_pos.here.position);
    gl.uniform4fv(this.uniforms.positionals.colors[i], c_pos.color);
    gl.uniform1i(this.uniforms.positionals.enabled[i], c_pos.enabled);
  }
  gl.uniform1i(this.uniforms.positionals.uTotalPositional, this.lights.positionals.length);

  //bind directional
  if(this.lights.directional != null){
    var directional_light = this.lights.directional;

    gl.uniform3fv(this.uniforms.directional.direction, directional_light.direction);
    gl.uniform4fv(this.uniforms.directional.color, directional_light.color);
    gl.uniform1i(this.uniforms.directional.enabled, directional_light.enabled);
  }
  else{
    gl.uniform1i(this.uniforms.directional.enabled, false);
  }



  gl.uniform4fv(this.uniforms.uColor, this.currentColor);

  gl.uniformMatrix4fv(this.uniforms.uModelview, false, this.modelview );// bind modelview

  gl.bindBuffer(gl.ARRAY_BUFFER, modelObject.shape.coordsBuffer);
  gl.vertexAttribPointer(this.attr.aCoords, 3, gl.FLOAT, false, 0, 0);
  //gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);


  gl.bindBuffer(gl.ARRAY_BUFFER, modelObject.shape.normalBuffer);
  gl.vertexAttribPointer(this.attr.aNormal, 3, gl.FLOAT, false, 0, 0);


  //TEXTURES
  var useTexture = modelObject.textureName != null;
  gl.uniform1i(this.uniforms.uUseTexture, useTexture);

  if(useTexture){
    var texture = this.textures[modelObject.textureName];

    gl.enableVertexAttribArray(this.uniforms.aTexCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, modelObject.shape.texBuffer);
    gl.vertexAttribPointer(this.uniforms.aTexCoord , 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texture);
    gl.uniform1i(this.uniforms.uSampler, 0);

  }

  //END TEXTURES

  mat3.normalFromMat4(this.normalMatrix, this.modelview);
  gl.uniformMatrix3fv(this.uniforms.uNormalMatrix, false, this.normalMatrix);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelObject.shape.indexBuffer);

  gl.drawElements(gl.TRIANGLES, modelObject.shape.count, gl.UNSIGNED_SHORT, 0);


  if(useTexture){
    gl.disableVertexAttribArray(this.uniforms.aTexCoord);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

/**
  Pops the current modelview matrix
*/
CTTools.prototype.pop = function(){
  this.modelview = this.matrixStack.pop();
}

/**
  Pushes the current modelview matrix
*/
CTTools.prototype.push = function(){
  this.matrixStack.push( mat4.clone(this.modelview) );
}

/**
  Loads a file from an URL asynchronously
  @param url the file's url
  @param callback the callback function
*/
CTTools.getAsynchShader = function(url, callback){
  $.ajax({
    url:url,
    cache:false,
    success:callback
  });
}

/**
  Loads the default shaders file
*/
CTTools.downloadDefaultShaders = function(callback){
  CTTools.getAsynchShader("vertex.vert", function(vert){
    CTTools.getAsynchShader("fragment.frag", function(frag){
      callback(vert, frag);
    });
  });

}

/**
  Creates a texture
  @param url texture image url
  @param textureName texture name. Usefoul for retrieving a texutre (ex. tools.textures[textureName]). IT MUST BE UNIQUE AMONG ALL TEXURES
  @param callback callback function called when everything is ready
*/
CTTools.prototype.createTexture = function(url, textureName, callback){

  if( typeof this.textures[textureName] !== "undefined"){
    throw "Error: texture with the same name ("+textureName+") already loaded. Use a different name";
  }
  var gl = this.gl;
  var texture = new CTTexture(gl);
  var img = new Image();
  img.onload = function(){
    texture.bindToImage(this);
    callback(textureName);
  }
  img.src = url;
  this.textures[textureName] = texture;

}

/**
  Creates an animated Texture
  @param urls an array of URLs. each item must be an image
  @interval texture animation length in milliseconds
  @param textureName texture name. Usefoul for retrieving a texutre (ex. tools.textures[textureName]). IT MUST BE UNIQUE AMONG ALL TEXURES
  @animator the animator responsible of the animations
  @callback a callback function. Called when everything is ready
*/
CTTools.prototype.createAnimatedTexture = function(urls, interval, textureName, animator, callback){

  if( typeof this.textures[textureName] !== "undefined"){
    throw "Error: texture with the same name ("+textureName+") already loaded. Use a different name";
  }
  var gl = this.gl;
  var texture = new CTAnimatedTexture(gl, interval);

  var semaphore = urls.length;
  var storage = [];

  for(var i = 0; i < urls.length ; i++){

    var img = new Image();
    storage.push(img);

    img.onload = function(){
      semaphore--;
      if(semaphore === 0){
        texture.setImages(storage);

        animator.addAnimatedTexture(texture);
        callback(textureName);
      }
    };
    img.onerror = function(e){
      console.log(e);
    };

    img.src = urls[i];
  }

  this.textures[textureName] = texture;

}
