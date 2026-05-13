uniform float darkness;
uniform vec2 resolution;
uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 color = texture2D(tDiffuse, uv);
  vec2 center = uv - 0.5;
  float vignette = 1.0 - dot(center, center) * darkness;
  color.rgb *= vignette;
  gl_FragColor = color;
}
