export const glslCode = `
#define M_PI 3.1415926535897932384626433832795

// # of circles
#define NC 2
// Radius of samples
#define R 10
// # of arc
#define NA 8

precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texsize;

void main() {
    // # of samples
    const int ns = NC * NA;
    // Gap of angle
    float ga = ( 2.0f * M_PI ) / float(NA);
    float gr = float(R) / float(NC);

    float a[5] = float[5](0.6, 0.8, 0.4, 1.0, 0.2);
    vec2 sampleCoords[ns];
    // vec4 sampleColors[ns];
    vec4 bin[ns];
    int ina = 0;
    int inc = 0;
    int si = 0;
    // Current angle
    float ca = 0.0f;
    // Current radius
    float cr = 0.0f;
    
    // for ( ina=0; ina < NA ; ina++){
    //   for (inc=0; inc < NC ; inc++) {
    //     cr += gr;
    //     sampleCoords[ ina * NC + inc ] = vec2( cos(ca), sin(ca) ) * cr;
    //     bin[ina * NC + inc] = vec4(0.0, 0.0, 0.0, 0.0);
    //   }
    //   ca += ga;
    // }
    vec2 st = gl_FragCoord.xy / u_resolution ;
    // vec2 ss = gl_FragCoord.xy * u_resolution ;
    int xi = int(floor(gl_FragCoord.x /50.0)) % 5;
    gl_FragColor = texture2D(u_texture, st) *  a[xi];
    return;


    /*
    float max_avg =  0.0;
    float min_avg =  1.0;
    vec4 smpClr = vec4(0.0, 0.0, 0.0, 0.0);
    for (si = 0; si < ns ; si ++){
      vec2 sampleCoord = (gl_FragCoord.xy + sampleCoords[si].xy) / u_resolution;
      smpClr = texture2D(u_texture, sampleCoord);
      sampleColors[si] = smpClr;
      float v_avg = ( smpClr.r + smpClr.g + smpClr.b ) / 3.0;
      if ( max_avg < v_avg ) {
        max_avg = v_avg;
      }else if ( min_avg > v_avg ) {
        min_avg = v_avg;
      }
    }
    vec4 retColor =vec4(0.0, 0.0, 0.0, 0.0); // vec4(bin[0].rgb / bin[0].a, 1.0); // vec4(0.0, 0.0, 0.0, 0.0);

    for (si = 0; si < ns ; si ++){
      vec4 smpClr = sampleColors[si];
      retColor += smpClr;
      // float v_avg = ( smpClr.r + smpClr.g + smpClr.b ) / 3.0;
      // int bin_i = int( ( v_avg * float(ns) ) / ( max_avg - min_avg ) + 0.5 );
      // bin[bin_i] += vec4( smpClr.rgb, 1.0);
    }

    retColor /= float(ns);
    int middle = ns / 2;

    // vec4 retColor = vec4(bin[0].rgb / bin[0].a, 1.0); // vec4(0.0, 0.0, 0.0, 0.0);
    // for ( si = 0; si<ns ; ){
    //   if ( bin[si].w > 0.0 ) { retColor.xyz = bin[si].xyz; }
    //   si += int(bin[si].w);
    // }
    

    gl_FragColor = retColor; // * a[xi] ; //sampleColor * a[xi]; //texture2D(u_texture, st) * a[xi] ;
    */
  }
`;