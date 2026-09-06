export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const FLOW_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_previous;
uniform vec2 u_pointer;
uniform vec2 u_velocity;
uniform float u_aspect;
uniform float u_decay;
uniform float u_inject;
out vec4 out_color;
void main() {
  vec4 previous = texture(u_previous, v_uv);
  vec2 delta = (v_uv - u_pointer) * vec2(u_aspect, 1.0);
  float brush = exp(-dot(delta, delta) / 0.008) * u_inject;
  float speed = min(length(u_velocity * vec2(u_aspect, 1.0)) * 24.0, 1.0);
  float strength = brush * speed;
  float density = max(previous.r * u_decay, strength);
  vec2 velocity = mix(vec2(0.5), previous.gb, u_decay);
  velocity = mix(velocity, clamp(u_velocity * 8.0 + 0.5, 0.0, 1.0), strength);
  out_color = vec4(density, velocity, 1.0);
}`;

export const INK_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_flow;
uniform sampler2D u_scene0;
uniform sampler2D u_scene1;
uniform sampler2D u_scene2;
uniform vec3 u_weights;
uniform vec3 u_anchors;
uniform vec3 u_periods;
uniform vec2 u_resolution;
uniform vec3 u_ink;
uniform float u_opacity;
uniform float u_time;
uniform float u_flow_strength;
out vec4 out_color;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x),
    mix(hash21(i+vec2(0,1)), hash21(i+vec2(1)), f.x), f.y);
}
// Artwork has a 3:2 aspect. Landscape uses contain, anchored at the bottom;
// portrait uses cover with a scene-specific horizontal focal point.
vec2 artworkUV(float anchor) {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = vec2(v_uv.x, 1.0-v_uv.y);
  if (aspect >= 1.0) {
    if (aspect > 1.5) uv.x = (uv.x-0.5) * aspect/1.5 + 0.5;
    else uv.y = 1.0-(1.0-uv.y)*1.5/aspect;
  } else {
    uv.x = uv.x*aspect/1.5 + (1.0-aspect/1.5)*anchor;
  }
  return uv;
}
float ink(sampler2D painting, float anchor, float period, vec2 flow) {
  vec2 uv = artworkUV(anchor);
  if (any(lessThan(uv,vec2(0))) || any(greaterThan(uv,vec2(1)))) return 0.0;
  vec3 layers = texture(painting, uv).rgb;
  vec2 p = vec2(v_uv.x*u_resolution.x/u_resolution.y, v_uv.y)*3.5;
  float time = u_time/period;
  vec2 drift = vec2(noise(p+vec2(time,-time*.7)), noise(p+vec2(-time*.5,time)+13.0))-.5;
  vec2 displaced = clamp(uv + (drift*0.023 + vec2(flow.x,-flow.y)*0.065)*layers.b, vec2(0.002),vec2(.998));
  float wash = texture(painting, displaced).g;
  // Strong brushwork remains stationary. Only low-frequency diluted ink moves.
  float density = layers.r*0.78 + wash*(0.30+0.06*sin(time*6.283+p.x));
  float feather = smoothstep(0.0,0.025,uv.x)*smoothstep(0.0,0.025,1.0-uv.x)
    *smoothstep(0.0,0.02,uv.y)*smoothstep(0.0,0.025,1.0-uv.y);
  return density*feather;
}
void main() {
  vec4 brush = texture(u_flow, v_uv);
  vec2 flow = (brush.gb-.5)*2.0*brush.r*u_flow_strength;
  float density = 0.0;
  if(u_weights.x>.0001) density += ink(u_scene0,u_anchors.x,u_periods.x,flow)*u_weights.x;
  if(u_weights.y>.0001) density += ink(u_scene1,u_anchors.y,u_periods.y,flow)*u_weights.y;
  if(u_weights.z>.0001) density += ink(u_scene2,u_anchors.z,u_periods.z,flow)*u_weights.z;
  float alpha = clamp(density*u_opacity,0.0,0.5);
  out_color = vec4(u_ink*alpha,alpha);
}`;
