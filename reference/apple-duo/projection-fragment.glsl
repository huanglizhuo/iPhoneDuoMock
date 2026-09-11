
vec3 v = normalize(vLocalCameraPosition - vLocalPosition);
vec3 worldNormal = normalize(inverseTransformDirection(normal, viewMatrix));
vec3 n = normalize(vRotationMatrixInverse * worldNormal);

v = clampAngleFromAxis(v, n, radians(maxViewingAngle)); // <-- clamp here

vec3 vRefraction = normalize(refract(-v, n, 1.0));
vec3 vFlat = -n;
vec3 viewDir = normalize(mix(vRefraction, vFlat, 0.0));

// planar
vec3 la = vLocalPosition;
vec3 lb = vLocalPosition + viewDir;
vec4 intersectionResult = planeLineIntersection(p0, p1, p2, la, lb);
vec3 intersectionLocation = intersectionResult.yzw;

float planarU = dot(p0, -p1) + dot(intersectionLocation, p1);
float planarV = dot(p0, -p2) + dot(intersectionLocation, p2);

vec2 lookupBasis = vec2(planarU, planarV);
// end planar

vec2 emissiveMapSize = vec2(textureSize(emissiveMap, 0));
vec2 texSize = emissiveMapSize.x > emissiveMapSize.y ? landscapeSize : portraitSize;
float aspect = texSize.x / texSize.y;
vec2 lookupUv = lookupBasis * (1.0 / scale) * vec2(1.0, aspect) * (1.0 / zoom) * vec2(0.988) + vec2(0.5 + wipeAmount * offset, 0.5);

vec2 uv = mix(
  (lookupUv - 0.5) * wallpaperUvScale.x + 0.5,
  (vec2(vUv.x, 1.0 - vUv.y) - 0.5) * wallpaperUvScale + 0.5,
  enableFraming ? transitionToCameraRest : 1.0
);

uv = (uv - 0.5) / (enableFraming ? 1.12 : 1.0) + 0.5;

// Shading
float distanceToWipe = distance(vUv.x, wipePosition);
float wipe = 1.0 - clamp(smoothstep(shadeBounds.x, shadeBounds.y, distanceToWipe) * wipeAmount * 1.5, 0.0, 1.0) * (enableFraming ? 1.0 : 0.0);
float edges = smoothstep(1.1, 1.0, uv.x) * smoothstep(-0.1, 0.0, uv.x) *
              smoothstep(1.1, 1.0, uv.y) * smoothstep(-0.1, 0.0, uv.y);

float camera = 1.0;
// Landscape
if (texSize.x > texSize.y) {
  vec2 insideRes = vec2(2853.0, 2007.0);
  float radius = cameraRadius / insideRes.y;
  vec2 pos = (cameraPos / insideRes) * vec2(aspect, 1.0);
  float circle = fill(circleSDF(vUv * vec2(aspect, 1.0) - pos), radius);
  camera = mix(camera, cameraDarkness, circle);
  // Extra inner shadow on the left
  edges = mix(edges, edges * smoothstep(0.05, 0.5, uv.x), smoothstep(0.0, 0.55, wipeAmount));
}


// Composite
float emissiveBrightness = mix(minShading, 1.0, smoothstep(0.1, 1.0, brightness) * wipe * edges * camera);
totalEmissiveRadiance = texture(emissiveMap, uv).rgb * emissive * emissiveBrightness;
