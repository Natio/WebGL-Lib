precision highp float;


uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform bool uUseTexture;

const int NUM_SPOTS = 10;

uniform int uTotalSpots;
uniform vec3 uSpotsPosition[NUM_SPOTS];
uniform vec3 uSpotsDirection[NUM_SPOTS];
uniform vec4 uSpotsColor[NUM_SPOTS];
uniform bool uSpotsEnabled[NUM_SPOTS];

const int NUM_POS = 10;

uniform int uTotalPositional;
uniform vec3 uPositionalPosition[NUM_SPOTS];
uniform vec4 uPositionalColor[NUM_SPOTS];
uniform bool uPositionalEnabled[NUM_SPOTS];

uniform bool uShowSun;
uniform vec3 uSunDirection;
uniform vec4 uSunColor;


varying vec4 vColor;
varying vec3 vnormal;
varying vec3 vpos;

vec3 phongShading(vec3 L, vec3 N, vec3 V, vec3 lightColor);
vec3 spotLight(vec3 spotPositon, vec3 currentPos, vec3 spotDir, vec4 sColor, vec3 N, vec3 V);


void main() {

    vec3 finalcolor = vec3(0.0, 0.0, 0.0);
    vec3 L;
    vec3 N = normalize(vnormal);
    vec3 V = normalize(-vpos);

    /*********  SUN  *********/
    if(uShowSun){
      L = normalize(uSunDirection);
      finalcolor += phongShading(L, N, V, vec3(uSunColor));
    }


    /*********  POSITIONALS  *********/

    for (int i = 0; i < NUM_POS; i++){

      if(i >= uTotalPositional){
        break;
      }
      if(uPositionalEnabled[i]){
        float r =  length(uPositionalPosition[i] - vpos);
        L = normalize(uPositionalPosition[i] - vpos);
        vec3 lc= vec3(uPositionalColor[i]) / (0.08*3.14 * 3.14 *r*r);
        finalcolor += phongShading(L,N,V, lc) ;
      }
    }


    /*********  SPOTS  *********/
    for (int i = 0; i < NUM_SPOTS; i++){
      if(i >= uTotalSpots){
        break;
      }
      if(uSpotsEnabled[i]){
        finalcolor += spotLight(uSpotsPosition[i], vpos, uSpotsDirection[i], uSpotsColor[i], N,  V);

      }
    }

    /********* FAKE COLOR ***********/
    vec4 color = vColor;
    vec3 unitNormal = vnormal;
    float multiplier = abs(unitNormal.z);
    vec4 temp_color = vec4( multiplier*color.r, multiplier*color.g, multiplier*color.b, color.a );


    /** FINAL SETUP & TEXTURES **/
    //gl_FragColor = vec4(finalcolor, 1.0) * vColor + temp_color * vec4(0.3,0.3,0.3,1.0); //TODO remove sum
    gl_FragColor =  vec4(finalcolor, 1.0) * vColor;
    if(uUseTexture){
      gl_FragColor = texture2D(uSampler, vTextureCoord) * vec4(finalcolor, 1.0)  ;
      //gl_FragColor = texture2D(uSampler, vTextureCoord)  * vec4(0.3,0.3,0.3,1.0);
    }

    //gl_FragColor = temp_color;
}



vec3 spotLight(vec3 spotPositon, vec3 currentPos, vec3 spotDir, vec4 sColor, vec3 N, vec3 V){
  float cutOff = 0.9;
  float fallOff = 5.0;
  float r =  length(spotPositon - currentPos);
  vec3 L = normalize(spotPositon - currentPos);
  float LdotD = dot( normalize(spotDir), L);
  if(LdotD >  cutOff){
    LdotD = pow(LdotD, fallOff);
  }
  else{
    LdotD = 0.0;
  }
  vec3 lc = sColor.xyz  *LdotD / (0.009*3.14 * 3.14 *r*r);
  return phongShading(L,N,V,lc);
}


vec3 phongShading(vec3 L, vec3 N, vec3 V, vec3 lightColor){

  vec3 vDiffuse= vec3(0.0,0.0,0.0);
  vec3 mat_ambient = vec3(0.1, 0.1, 0.1);
  vec3 mat_diffuse = vec3(1.0, 1.0, 1.0);
  vec3 mat_specular= vec3(1.0, 1.0, 1.0);
  float uKa = 0.1;
  float uKd = 0.8;
  float uKs = 0.3;

  float uShininess = 20.3;

  vec3 ambient = mat_ambient;

  float NdotL = max(0.0, dot(N, L));
  vec3 diffuse = (mat_diffuse * lightColor) * NdotL;

  // specular component
  vec3 R = (2.0 * NdotL * N) - L;
  float RdotV = max(0.0, dot(R, V));
  float spec = pow(RdotV, uShininess);
  vec3 specular = (mat_specular * lightColor) * spec;
  vec3 contribution = uKa * ambient + uKd * diffuse + uKs * specular;
  return contribution;
}
