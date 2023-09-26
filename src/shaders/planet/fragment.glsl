uniform sampler2D planetTexture;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
    float intensity = pow(0.2 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    vec3 atmosphere = vec3(0.35, 0.30, 0.15) * pow(intensity, 1.5);

    gl_FragColor = vec4(atmosphere + texture2D(planetTexture, vUv).xyz, 1.0);

}