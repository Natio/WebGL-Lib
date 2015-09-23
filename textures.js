
/**
  Class that represents a texture.
  @param gl a WebGl context
  @return an instanciated CTTexture object
*/
function CTTexture(gl){
  this.gl = gl;
  this.texture = gl.createTexture();
  this.image = null;

  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.bindTexture(gl.TEXTURE_2D, null);

  this.textureReady = false;
}

/**
  Binds the texture to an image. It is called automatically by the runtime
  @param image the image to bind
*/
CTTexture.prototype.bindToImage = function(image){
  this.image = image;
  var gl = this.gl;
  gl.bindTexture(gl.TEXTURE_2D, this.texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
  gl.bindTexture(gl.TEXTURE_2D, null);
  this.textureReady = true;
}


/**
  Class that rapresents an animated texture
  @param gl webgl context
  @param animation_interval the animation interval in milliseconds
  @return an instanciated CTAnimatedTexture
*/
function CTAnimatedTexture(gl, animation_interval){
  CTTexture.call(this, gl);
  this.interval = animation_interval;
  this.currentImage = 0;
  this.animator = null;
}

CTAnimatedTexture.prototype = Object.create(CTTexture.prototype);

/**
  Sets the images of the animation
  @param images an array of images
*/
CTAnimatedTexture.prototype.setImages = function(images){
  this.images = images;
  this.bindToImage(images[0]);
  this.currentImageIndex = 0;
  this.currentDelta = 0;
  this.textureReady = true;
}

/**
  Makes the animation advance of a single step
  @param dt delta time
*/
CTAnimatedTexture.prototype.ticTexture = function(dt){

  this.currentDelta += dt;
  //if "interval" millis have not passes do not change image
  if(this.currentDelta < this.interval){
    return;
  }

  var nextImageIndex = (this.currentImageIndex + 1) % this.images.length;
  this.currentImageIndex = nextImageIndex;
  this.bindToImage(this.images[this.currentImageIndex]);

  this.currentDelta -= this.interval;

  //this condition is for avoiding negative values
  if(this.currentDelta < 0 || this.currentDelta > this.interval){
    this.currentDelta = 0;
  }

}
