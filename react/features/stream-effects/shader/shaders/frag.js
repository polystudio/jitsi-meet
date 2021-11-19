export const glslCode = `
#define M_PI 3.1415926535897932384626433832795

// # of circles
#define NC 4
// Radius of samples
#define R 6
// # of arc
#define NA 8

precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texsize;

float getLum(vec4 color){
  return dot(vec3(0.30, 0.59, 0.11), color.xyz);
  // return (color.r + color.g + color.b) /3.0 ;
}

void main() {
    // # of samples
    const int ns = NC * NA;
    // Gap of angle
    float ga = ( 2.0f * M_PI ) / float(NA);
    float gr = float(R) / float(NC);

    float a[5] = float[5](0.6, 0.8, 0.4, 1.0, 0.2);
    vec2 sampleCoords[ns];
    vec4 sampleColors[ns];
    vec4 bin[ns];
    int ina = 0;
    int inc = 0;
    int si = 0;
    // Current angle
    float ca = 0.0f;
    // Current radius
    float cr = 0.0f;
    
    for ( ina=0; ina < NA ; ina++){
      for (inc=0; inc < NC ; inc++) {
        cr += gr;
        sampleCoords[ ina * NC + inc ] = vec2( cos(ca), sin(ca) ) * cr;
        bin[ina * NC + inc] = vec4(0.0, 0.0, 0.0, 0.0);
      }
      ca += ga;
    }
    vec2 res = u_resolution / u_texsize.xy;
    vec2 img_size = u_texsize.xy * max(res.x, res.y);
    vec2 img_org = 0.5 * (u_resolution.xy - img_size);
    vec2 uv = (gl_FragCoord.xy - img_org) / img_size;
    // vec2 st = gl_FragCoord.xy / u_resolution ;
    
    vec4 smpClr = vec4(0.0, 0.0, 0.0, 0.0);
    for (si = 0; si < ns ; si ++) {
      vec2 sampleCoord =  (0.5 + floor(uv * u_texsize.xy) +  sampleCoords[si] ) /  u_texsize.xy;
      smpClr = texture2D(u_texture, sampleCoord );
      sampleColors[si] = vec4(smpClr.rgb, getLum(smpClr));
    }

    // retColor /= float(ns);
    int middle = ns / 2;

    int i=0;
    int j=0;
    vec4 tmp;
    for ( i = 1 ; i < ns; i++) {
      j = i;
      tmp = sampleColors[i];
      while (--j >= 0 && tmp.a < sampleColors[j].a ){
        sampleColors[j+1] = sampleColors[j];
      }
      sampleColors[j+1] = tmp;
    }
    vec4 retColor = sampleColors[middle]; 

    gl_FragColor = vec4 (retColor.rgb, 1.0);
  }
`;