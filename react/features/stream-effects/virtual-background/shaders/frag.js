export const glslCode = `
#define M_PI 3.1415926535897932384626433832795

// # of circles
#define NC 8
// Radius of samples
#define R 0.8
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
    vec2 st = gl_FragCoord.xy / u_resolution ;
    // vec2 ss = gl_FragCoord.xy * u_resolution ;
    int xi = int(floor(gl_FragCoord.x /50.0)) % 5;
    gl_FragColor = texture2D(u_texture, st) *  a[xi];
    
    float max_avg =  0.0;
    float min_avg =  1.0;
    vec4 smpClr = vec4(0.0, 0.0, 0.0, 0.0);
    for (si = 0; si < ns ; si ++){
      vec2 sampleCoord = (gl_FragCoord.xy + sampleCoords[si].xy) / u_resolution;
      smpClr = texture2D(u_texture, sampleCoord);
      sampleColors[si] = vec4(smpClr.rgb, getLum(smpClr));
      // float v_avg = getLum(smpClr); //( smpClr.r + smpClr.g + smpClr.b ) / 3.0;
      // if ( max_avg < v_avg ) {
      //   max_avg = v_avg;
      // }else if ( min_avg > v_avg ) {
      //   min_avg = v_avg;
      // }
    }
    // vec4 retColor =  vec4(0.0, 0.0, 0.0, 0.0); //sampleColors[si]; //vec4(bin[0].rgb / bin[0].a, 1.0);

    // for (si = 0; si < ns ; si ++){
    //   vec4 smpClr = sampleColors[si];
    //   float v_avg = getLum(smpClr); //( smpClr.r + smpClr.g + smpClr.b ) / 3.0;
    //   int bin_i = int( ( ( v_avg - min_avg ) * float(ns) ) / ( max_avg - min_avg ) + 0.5 );
    //   bin[bin_i] += vec4( smpClr.rgb, 1.0);
    // }

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
    // vec4 retColor = vec4(0.0, 0.0, 0.0, 0.0); 
    // for ( si = 0; si<middle ; ){
    //   if ( bin[si].a > 0.0 ) { 
    //     retColor = bin[si] ; 
    //     si += int(bin[si].a);
    //   }else{
    //     si += 1;
    //   }
    // }

    gl_FragColor = retColor;

    // gl_FragColor = vec4(retColor.rgb /retColor.a, 1.0); // * a[xi] ; //sampleColor * a[xi]; //texture2D(u_texture, st) * a[xi] ;
    
  }
`;