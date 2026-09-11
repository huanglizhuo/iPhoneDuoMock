
// Local-space position (skip modelMatrix)
vLocalPosition = transformed;

// Rotation-only matrix (no scale), used to rotate world-space *directions*
// (like the normal) back into local orientation in the fragment shader.
mat3 modelRotation = mat3( modelMatrix );
vec3 modelScale = vec3(
	length( modelRotation[0] ),
	length( modelRotation[1] ),
	length( modelRotation[2] )
);
mat3 rotationMatrix = mat3(
	modelRotation[0] / modelScale.x,
	modelRotation[1] / modelScale.y,
	modelRotation[2] / modelScale.z
);
vRotationMatrixInverse = transpose( rotationMatrix ); // rotation matrices are orthonormal, so transpose == inverse

// Camera position transformed into local space. cameraPosition and
// modelMatrixInverse are both uniform, so this is constant across the
// triangle — cheap to compute per-vertex and interpolate.
vec3 camPos = cameraPosition; // cameraPosition
vLocalCameraPosition = ( modelMatrixInverse * vec4( camPos, 1.0 ) ).xyz;

vec3 up = vec3(0., 1., 0.);
vec3 right = vec3(1., 0., 0.);
vec3 forward = vec3(0., 0., 1.);

p0 = emissiveLocalPos;
p1 = rotateAxis(rotateAxis(rotateAxis(vec3(1., 0., 0.), right, rotation.x), up, rotation.y), forward, rotation.z);
p2 = rotateAxis(rotateAxis(rotateAxis(vec3(0., 1., 0.), right, rotation.x), up, rotation.y), forward, rotation.z);
