// uniform sampler2D planetHeightMap;

// attribute vec2 texcoord;

varying vec2 vUv;
varying vec3 vNormal;
//set in displacement map, apply it on the final position

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // float displacementScale = 10.0;
    // float displacement = texture2D(planetHeightMap, texcoord).r * displacementScale;
    // vec4 displacedPosition = vec4(position, 0) + vec4(0, displacement, 0, 0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); //* displacedPosition
}