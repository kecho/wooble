attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec4 aPrivateColor;

//private attributes
attribute float aVertexId;

//private matrices
uniform mat4 uViewProj;

uniform float uDepthBias;
uniform float uPointSize;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vPrivateColor;
varying vec4 vScreen;
varying float vVertexId;


void main () {
    vec4 projPos = uViewProj * vec4(aPosition , 1.0); 
    vWorldPosition = aPosition;
    vWorldNormal = aNormal ;
    vScreen = projPos;
    vVertexId = aVertexId;
    vPrivateColor = aPrivateColor;
    gl_Position = projPos;
    gl_Position.z -= uDepthBias * gl_Position.w;
    gl_PointSize = uPointSize;
}
