uniform float time;
uniform vec2 resolution;
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);

  // scanlines
  float scanline = sin(uv.y * resolution.y * 1.5) * 0.04;
  color.rgb -= scanline;

  // slight chromatic aberration
  float ca = 0.001;
  float r = texture2D(tDiffuse, uv + vec2(ca, 0.0)).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - vec2(ca, 0.0)).b;
  color.rgb = vec3(r, g, b);

  // subtle flicker
  color.rgb *= 0.97 + 0.03 * sin(time * 24.0 + uv.y * 100.0);

  gl_FragColor = color;
}
