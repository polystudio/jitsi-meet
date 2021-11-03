export const glslCode = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_texsize;

void main() {
    float a[5] = float[5](0.6, 0.8, 0.4, 1.0, 0.2);
    vec2 st = gl_FragCoord.xy / u_resolution ;
    vec2 ss = gl_FragCoord.xy * u_resolution ;
    int xi = int(floor(gl_FragCoord.x /50.0)) % 5;
    // gl_FragColor = texture2D(u_texture, st) ;
    gl_FragColor = texture2D(u_texture, st) * a[xi] ;
  }
`;