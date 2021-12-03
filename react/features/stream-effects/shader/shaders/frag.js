export const glslCode = `
#define M_PI 3.1415926535897932384626433832795

// # of circles
#define NC 6
// Radius of samples
#define R 40
// # of arc
#define NA 6

#define ROUND(x) round(x*10.0)*0.1

precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texsize;

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float getLum(vec4 color){
  return distance(color.rgb, vec3(0,0,0));
  // return dot(vec3(0.30, 0.59, 0.11), color.xyz);
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
      }
      cr = 0.0;
      ca += ga;
    }
    vec2 res = u_resolution / u_texsize.xy;
    vec2 img_size = u_texsize.xy * max(res.x, res.y);
    vec2 img_org = 0.5 * (u_resolution.xy - img_size);
    vec2 uv = (gl_FragCoord.xy - img_org) / img_size;
    
    vec4 smpClr = vec4(0.0, 0.0, 0.0, 0.0);
    for (si = 0; si < ns ; si ++) {
      vec2 texCoord =  (floor(uv * u_texsize.xy + 0.5) +  sampleCoords[si] ) /  u_texsize.xy;
      smpClr = texture2D(u_texture, texCoord );
      // vec4 tmpClr = rgb2hsv(smpClr.rgb);
      sampleColors[si] = vec4(smpClr.rgb, getLum(smpClr));
    }

    int middle = ns / 2;

    int i=0;
    int j=0;
    vec4 tmp;

    // ###### Median Effect
    for ( i = 1 ; i < ns; i++) {
      j = i;
      tmp = sampleColors[i];
      while (--j >= 0 && tmp.a < sampleColors[j].a ){
        sampleColors[j+1] = sampleColors[j];
      }
      sampleColors[j+1] = tmp;
    }
    vec4 retColor = sampleColors[middle-3] + sampleColors[middle-2] + sampleColors[middle-1] + sampleColors[middle] + sampleColors[middle+1] + sampleColors[middle+2] + sampleColors[middle+3];
    retColor /= 7.0;
    // ###### Median End

    // // ###### Blur Effect
    // for ( i = 1 ; i < ns; i++) {
    //   tmp += sampleColors[i];
    // }
    // tmp = tmp / float(ns);
    // vec4 retColor = tmp;
    // // ###### Blur End

    // // Rounding luminance
    retColor = vec4(rgb2hsv(retColor.rgb), 1.0);
    retColor = vec4(retColor.x, retColor.y, ROUND(retColor.z)*1.3, 1.0);
    gl_FragColor = vec4 (hsv2rgb(retColor.xyz), 1.0);

    // No post-processing
    // gl_FragColor = retColor;
  }
`;