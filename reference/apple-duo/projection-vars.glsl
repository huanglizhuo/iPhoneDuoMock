
uniform float wipeAmount;
uniform float wipePosition;
uniform float minShading;
uniform float offset;
uniform float scale;
uniform float brightness;
uniform vec2 shadeBounds;
uniform float zoom;
uniform float transitionToCameraRest;
uniform vec2 wallpaperUvScale;
uniform bool enableFraming;
uniform mat4 modelMatrixInverse;
varying vec3 vLocalPosition;
varying vec3 vLocalCameraPosition;
varying mat3 vRotationMatrixInverse;
varying vec3 p0;
varying vec3 p1;
varying vec3 p2;

uniform vec2 cameraPos;
uniform float cameraRadius;
uniform float cameraDarkness;
uniform float maxViewingAngle;

#define landscapeSize vec2(2670.0, 1878.0)
#define portraitSize vec2(1291.0, 1878.0)

vec4 planeLineIntersection(vec3 P0, vec3 P01, vec3 P02, vec3 la, vec3 lb) {
  vec3 lab = lb - la;
  vec3 planeNormalUnscaled = cross(P01, P02);
  float det = -dot(lab, planeNormalUnscaled);

  float epsilon = 0.05;
  // was: float confidence = smoothstep(0.0, epsilon, abs(det));
  float confidence = smoothstep(0.0, epsilon, det); // sign-aware: 0 on the back side, not just near det=0

  float safeDet = sign(det) * max(abs(det), epsilon);

  float u = 1.0/safeDet * dot(cross(P02, -lab), la - P0);
  float v = 1.0/safeDet * dot(cross(-lab, P01), la - P0);
  vec3 x = P0 + P01 * u + P02 * v;

  return vec4(confidence, x);
}

vec3 clampAngleFromAxis(vec3 dir, vec3 axis, float maxAngle) {
  float cosMax = cos(maxAngle);
  vec3 ax = dot(dir, axis) < 0.0 ? -axis : axis;
  float c = dot(dir, ax);
  if (c >= cosMax) return dir; // already inside the cone

  vec3 tangent = dir - ax * c;
  float tLen = length(tangent);
  if (tLen < 1e-5) return ax; // dir was ~parallel to axis already
  tangent /= tLen;

  float sinMax = sqrt(1.0 - cosMax * cosMax);
  return ax * cosMax + tangent * sinMax;
}

float aastep(float threshold, float value) {
  float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));
  return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float circleSDF(in vec2 v) {
  return length(v) * 2.0;
}

float fill(float x, float size) {
  return 1.0 - aastep(size, x);
}
