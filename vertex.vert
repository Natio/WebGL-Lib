precision highp float;

attribute vec3 coords;

//Textures
attribute vec2 aTexCoord;
varying vec2 vTextureCoord;


attribute vec3 normal;
uniform mat4 modelview;
uniform mat4 projection;
uniform mat3 normalMatrix;
uniform vec4 uColor;

varying vec4 vColor;
varying vec3 vnormal;
varying vec3 vpos;



void main() {
  vec4 vcoords = vec4(coords,1.0);
  vec4 transformedVertex = modelview * vcoords;
  gl_Position = projection * transformedVertex;

  vColor = uColor;
  vpos = vec3(modelview * vcoords);
  vnormal = vnormal = normalize(normalMatrix*normal);
  vTextureCoord = aTexCoord;

}
