attribute vec3 aPosition;
attribute vec3 aNormal;

uniform float depthBias;
uniform mat4 uViewProj;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vScreen;

void main () {
    vec4 projPos = uViewProj * vec4(aPosition , 1.0); 
    vWorldPosition = aPosition;
    vWorldNormal = aNormal ;
    vScreen = projPos;
    gl_Position = projPos;
    gl_Position.z -= depthBias * gl_Position.w;
    gl_PointSize = 6.0;
}
