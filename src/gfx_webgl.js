/*!
* x3dom javascript library 0.1
* http://x3dom.org/
*
* Copyright (c) 2009 Peter Eschler, Johannes Behr, Yvonne Jung
*     based on code originally provided by Philip Taylor:
*     http://philip.html5.org
* Dual licensed under the MIT and GPL licenses.
* 
*/

// This code is for Firefox/Minefield compatibility.  WebGL
// originally used a class called CanvasFloatArray, but the
// specification has now changed, and it's called WebGLFloatArray.
// Firefox/Minefield still (as of 13 Nov 2009) uses the old
// name, but WebKit/Safari uses the new one.  The main WebGL
// code in this page uses the new name, but the compatibility
// code that follows will stay here for the time being to make 
// sure that Firefox users can view the page.
try
{
  WebGLFloatArray;
}
catch (e)
{
  try
  {
    WebGLArrayBuffer = CanvasArrayBuffer;
    WebGLByteArray = CanvasByteArray;
    WebGLUnsignedByteArray = CanvasUnsignedByteArray;
    WebGLShortArray = CanvasShortArray;
    WebGLUnsignedShortArray = CanvasUnsignedShortArray;
    WebGLIntArray = CanvasIntArray;
    WebGLUnsignedIntArray = CanvasUnsignedIntArray;
    WebGLFloatArray = CanvasFloatArray;
  }
  catch (e)
  {
    //alert("Could not find Canvas array types for WebGL.");
  }
}
// End of compatibility code


x3dom.gfx_webgl = (function () {

	function Context(ctx3d, canvas, name) {
		this.ctx3d = ctx3d;
		this.canvas = canvas;
		this.name = name;
	}

	Context.prototype.getName = function() {
		return this.name;
	};

	function setupContext(canvas) {
		// TODO: add experimental-webgl, webgl test    
		// x3dom.debug.logInfo("setupContext: canvas=" + canvas);
        var validContextNames = ['moz-webgl', 'webkit-3d', 'experimental-webgl', 'webgl'];
        var ctx = null;
        // Context creation params (not yet working)
        // https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/doc/spec/WebGL-spec.html#5.2.1
        var ctxAttribs = { alpha: true,
                           depth: true,
                           stencil: true,
                           antialias: true,
                           premultipliedAlpha: false 
                         };
        // FIXME; do we need to handle context lost events?
        // https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/doc/spec/WebGL-spec.html#5.16.1
        for (var i=0; i<validContextNames.length; i++) {
            try {
                ctx = canvas.getContext(validContextNames[i], ctxAttribs);
                if (ctx) {
                    return new Context(ctx, canvas, 'moz-webgl');
                }
            }
            catch (e) {}
        }
		return null;
	}

	var g_shaders = {};
    
    g_shaders['vs-x3d-bg-texture'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"varying vec2 fragTexCoord;" +
		"" +
		"void main(void) {" +
		"    gl_Position = vec4(position.xy, 0.0, 1.0);" +
        "    vec2 texCoord = (position.xy + 1.0) * 0.5;" +
        //"    fragTexCoord = vec2(texCoord.x, 1.0-texCoord.y);" +
        "    fragTexCoord = texCoord;" +
		"}"
		};
        
    g_shaders['fs-x3d-bg-texture'] = { type: "fragment", data:
		"uniform sampler2D tex;" +
		"varying vec2 fragTexCoord;" +
		"" +
		"void main(void) {" +
		"    gl_FragColor = texture2D(tex, fragTexCoord);" +
		//"    gl_FragDepth = 1.0;" +
		"}"
		};
        
    g_shaders['vs-x3d-bg-textureCube'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"uniform mat4 modelViewProjectionMatrix;" +
        "varying vec3 fragNormal;" +
		"" +
		"void main(void) {" +
        "    fragNormal = (vec4(normalize(position), 0.0)).xyz;" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"}"
		};
        
    g_shaders['fs-x3d-bg-textureCube'] = { type: "fragment", data:
        "uniform samplerCube tex;" +
        "varying vec3 fragNormal;" +
		"" +
		"void main(void) {" +
        "    vec3 normal = -reflect(normalize(fragNormal), vec3(0.0,0.0,1.0));" +
        "    if (abs(normal.y) >= abs(normal.x) && abs(normal.y) >= abs(normal.z))" +
        "        normal.x *= -1.0;" +
        "    gl_FragColor = textureCube(tex, normal);" +
		"}"
		};
	
	g_shaders['vs-x3d-textured'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"attribute vec3 normal;" +
		"attribute vec2 texcoord;" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"varying vec2 fragTexCoord;" +
        "uniform float sphereMapping;" +
		"uniform mat4 modelViewProjectionMatrix;" +
		"uniform mat4 modelViewMatrix;" +
		"uniform vec3 lightDirection;" +
		"uniform vec3 eyePosition;" +
        "uniform mat4 matPV;" +
        "varying vec4 projCoord;" +
		"" +
		"void main(void) {" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"    fragNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;" +
		"    fragLightVector = -lightDirection;" +
		"    fragEyeVector = eyePosition - (modelViewMatrix * vec4(position, 1.0)).xyz;" +
        "    if (sphereMapping == 1.0) {" +
        "        fragTexCoord = 0.5 + fragNormal.xy / 2.0;" +
        "    }" +
        "    else {" +
        "       fragTexCoord = texcoord;" +
        "    }" +
        "    projCoord = matPV * vec4(position+0.5*normalize(normal), 1.0);" +
        //"    gl_Position = projCoord;" +
		"}"
		};
        
    g_shaders['vs-x3d-textured-tt'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"attribute vec3 normal;" +
		"attribute vec2 texcoord;" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"varying vec2 fragTexCoord;" +
        "uniform float sphereMapping;" +
		"uniform mat4 texTrafoMatrix;" +
		"uniform mat4 modelViewProjectionMatrix;" +
		"uniform mat4 modelViewMatrix;" +
		"uniform vec3 lightDirection;" +
		"uniform vec3 eyePosition;" +
        "uniform mat4 matPV;" +
        "varying vec4 projCoord;" +
		"" +
		"void main(void) {" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"    fragNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;" +
		"    fragLightVector = -lightDirection;" +
		"    fragEyeVector = eyePosition - (modelViewMatrix * vec4(position, 1.0)).xyz;" +
        "    if (sphereMapping == 1.0) {" +
        "        fragTexCoord = 0.5 + fragNormal.xy / 2.0;" +
        "    }" +
        "    else {" +
        "       fragTexCoord = (texTrafoMatrix * vec4(texcoord, 1.0, 1.0)).xy;" +
        "    }" +
        "    projCoord = matPV * vec4(position+0.5*normalize(normal), 1.0);" +
		"}"
		};
		
	g_shaders['fs-x3d-textured'] = { type: "fragment", data:
		"uniform float ambientIntensity;" +
		"uniform vec3 diffuseColor;" +
		"uniform vec3 emissiveColor;" +
		"uniform float shininess;" +
		"uniform vec3 specularColor;" +
        "uniform float sphereMapping;" +
		"uniform float alpha;" +
		"uniform float lightOn;" +
		"uniform sampler2D tex;" +
		"uniform sampler2D sh_tex;" +
        "uniform float shadowIntensity;" +
		"" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"varying vec2 fragTexCoord;" +
        "varying vec4 projCoord;" +
		"" +
        "float PCF_Filter(vec3 projectiveBiased, float filterWidth)" +
        "{" +
        "    float stepSize = 2.0 * filterWidth / 3.0;" +
        "    float blockerCount = 0.0;" +
        "    projectiveBiased.x -= filterWidth;" +
        "    projectiveBiased.y -= filterWidth;" +
        "    for (float i=0.0; i<3.0; i++)" +
        "    {" +
        "        for (float j=0.0; j<3.0; j++)" +
        "        {" +
        "            projectiveBiased.x += (j*stepSize);" +
        "            projectiveBiased.y += (i*stepSize);" +
        "            vec4 shCol = texture2D(sh_tex, (1.0+projectiveBiased.xy)*0.5);" +
        "            float z = (shCol.a * 16777216.0 + shCol.r * 65536.0 + shCol.g * 256.0 + shCol.b) / 16777216.0;" +
        "            if (z < projectiveBiased.z) blockerCount += 1.0;" +
        "            projectiveBiased.x -= (j*stepSize);" +
        "            projectiveBiased.y -= (i*stepSize);" +
        "        }" +
        "    }" +
        "    float result = 1.0 - shadowIntensity * blockerCount / 9.0;" +
        "    return result;" +
        "}" +
        "" +
		"void main(void) {" +
		"    vec3 normal = normalize(fragNormal);" +
		"    vec3 light = normalize(fragLightVector);" +
		"    vec3 eye = normalize(fragEyeVector);" +
		"    vec2 texCoord = vec2(fragTexCoord.x,1.0-fragTexCoord.y);" +
		"    float diffuse = max(0.0, dot(normal, light)) * lightOn;" +
		"    diffuse += max(0.0, dot(normal, eye));" +
		"    float specular = pow(max(0.0, dot(normal, normalize(light+eye))), shininess*128.0) * lightOn;" +
		"    specular += 0.8 * pow(max(0.0, dot(normal, normalize(eye))), shininess*128.0);" +
        "    vec4 texCol = texture2D(tex, texCoord);" +
        "    texCol.a *= alpha;" +
        "    vec3 rgb = emissiveColor;" +
        "    if (sphereMapping == 1.0) {" +
        "       rgb += (diffuse*diffuseColor + specular*specularColor) * texCol.rgb;" +
        "    }" +
        "    else {" +
        "       rgb += diffuse*texCol.rgb + specular*specularColor;" +
        "    }" +
		"    rgb = clamp(rgb, 0.0, 1.0);" +
        "    if (shadowIntensity > 0.0) { " +
        "      vec3 projectiveBiased = projCoord.xyz / projCoord.w;" +
        "      float shadowed = PCF_Filter(projectiveBiased, 0.002);" +
        "      rgb *= shadowed;" +
        "    }" +
        "    if (texCol.a <= 0.1) discard;" +
		"    else gl_FragColor = vec4(rgb, texCol.a);" +
		"}"
		};
        
	g_shaders['fs-x3d-textured-txt'] = { type: "fragment", data:
		"uniform float ambientIntensity;" +
		"uniform vec3 diffuseColor;" +
		"uniform vec3 emissiveColor;" +
		"uniform float shininess;" +
		"uniform vec3 specularColor;" +
		"uniform float alpha;" +
		"uniform float lightOn;" +
		"uniform sampler2D tex;" +
		"uniform sampler2D sh_tex;" +
        "uniform float shadowIntensity;" +
		"" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"varying vec2 fragTexCoord;" +
        "varying vec4 projCoord;" +
		"" +
		"void main(void) {" +
		"    vec3 normal = normalize(fragNormal);" +
		"    vec3 light = normalize(fragLightVector);" +
		"    vec3 eye = normalize(fragEyeVector);" +
		"    vec2 texCoord = vec2(fragTexCoord.x,1.0-fragTexCoord.y);" +
		"    float diffuse = abs(dot(normal, light)) * lightOn;" +
		"    diffuse += abs(dot(normal, eye));" +
		"    float specular = pow(abs(dot(normal, normalize(light+eye))), shininess*128.0) * lightOn;" +
		"    specular += 0.8 * pow(abs(dot(normal, normalize(eye))), shininess*128.0);" +
        "    vec3 rgb = texture2D(tex, texCoord).rgb;" +
        "    float len = clamp(length(rgb), 0.0, 1.0) * alpha;" +
		"    rgb *= (emissiveColor + diffuse*diffuseColor + specular*specularColor);" +
		"    rgb = clamp(rgb, 0.0, 1.0);" +
        "    if (shadowIntensity > 0.0) { " +
        "      vec3 projectiveBiased = projCoord.xyz / projCoord.w;" +
        "      vec4 shCol = texture2D(sh_tex, (1.0+projectiveBiased.xy)*0.5);" +
        "      float z = (shCol.a * 16777216.0 + shCol.r * 65536.0 + shCol.g * 256.0 + shCol.b) / 16777216.0;" +
        "      if (z < projectiveBiased.z) rgb *= (1.0 - shadowIntensity);" +
        "    }" +
        "    if (len <= 0.1) discard;" +
		"    else gl_FragColor = vec4(rgb, len);" +
		"}"
		};

	g_shaders['vs-x3d-untextured'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"attribute vec3 normal;" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"uniform mat4 modelViewProjectionMatrix;" +
		"uniform mat4 modelViewMatrix;" +
		"uniform vec3 lightDirection;" +
		"uniform vec3 eyePosition;" +
        "uniform mat4 matPV;" +
        "varying vec4 projCoord;" +
		"" +
		"void main(void) {" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"    fragNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;" +
		"    fragLightVector = -lightDirection;" +
		"    fragEyeVector = eyePosition - (modelViewMatrix * vec4(position, 1.0)).xyz;" +
        "    projCoord = matPV * vec4(position+0.5*normalize(normal), 1.0);" +
		"}"
		};
		
	g_shaders['fs-x3d-untextured'] = { type: "fragment", data:
		"uniform float ambientIntensity;" +
		"uniform vec3 diffuseColor;" +
		"uniform vec3 emissiveColor;" +
		"uniform float shininess;" +
		"uniform vec3 specularColor;" +
		"uniform float alpha;" +
		"uniform float lightOn;" +
		"uniform sampler2D sh_tex;" +
        "uniform float shadowIntensity;" +
		"" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
        "varying vec4 projCoord;" +
		"" +
        "float PCF_Filter(vec3 projectiveBiased, float filterWidth)" +
        "{" +
        "    float stepSize = 2.0 * filterWidth / 3.0;" +
        "    float blockerCount = 0.0;" +
        "    projectiveBiased.x -= filterWidth;" +
        "    projectiveBiased.y -= filterWidth;" +
        "    for (float i=0.0; i<3.0; i++)" +
        "    {" +
        "        for (float j=0.0; j<3.0; j++)" +
        "        {" +
        "            projectiveBiased.x += (j*stepSize);" +
        "            projectiveBiased.y += (i*stepSize);" +
        "            vec4 shCol = texture2D(sh_tex, (1.0+projectiveBiased.xy)*0.5);" +
        "            float z = (shCol.a * 16777216.0 + shCol.r * 65536.0 + shCol.g * 256.0 + shCol.b) / 16777216.0;" +
        "            if (z < projectiveBiased.z) blockerCount += 1.0;" +
        "            projectiveBiased.x -= (j*stepSize);" +
        "            projectiveBiased.y -= (i*stepSize);" +
        "        }" +
        "    }" +
        "    float result = 1.0 - shadowIntensity * blockerCount / 9.0;" +
        "    return result;" +
        "}" +
        "" +
		"void main(void) {" +
		"    vec3 normal = normalize(fragNormal);" +
		"    vec3 light = normalize(fragLightVector);" +
		"    vec3 eye = normalize(fragEyeVector);" +
		"    float diffuse = max(0.0, dot(normal, light)) * lightOn;" +
		"    diffuse += max(0.0, dot(normal, eye));" +
		"    float specular = pow(max(0.0, dot(normal, normalize(light+eye))), shininess*128.0) * lightOn;" +
		"    specular += 0.8 * pow(max(0.0, dot(normal, normalize(eye))), shininess*128.0);" +
		"    vec3 rgb = emissiveColor + diffuse*diffuseColor + specular*specularColor;" +
		"    rgb = clamp(rgb, 0.0, 1.0);" +
        "    if (shadowIntensity > 0.0) { " +
        "      vec3 projectiveBiased = projCoord.xyz / projCoord.w;" +
        "      float shadowed = PCF_Filter(projectiveBiased, 0.002);" +
        "      rgb *= shadowed;" +
        "    }" +
		"    gl_FragColor = vec4(rgb, alpha);" +
		"}"
		};
	
	g_shaders['vs-x3d-vertexcolor'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"attribute vec3 normal;" +
		"attribute vec3 color;" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragColor;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"uniform mat4 modelViewProjectionMatrix;" +
		"uniform mat4 modelViewMatrix;" +
		"uniform vec3 lightDirection;" +
		"uniform vec3 eyePosition;" +
        "uniform mat4 matPV;" +
        "varying vec4 projCoord;" +
		"" +
		"void main(void) {" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"    fragNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;" +
		"    fragLightVector = -lightDirection;" +
		"    fragColor = color;" +
		"    fragEyeVector = eyePosition - (modelViewMatrix * vec4(position, 1.0)).xyz;" +
        "    projCoord = matPV * vec4(position+0.5*normalize(normal), 1.0);" +
		"}"
		};
	
	g_shaders['fs-x3d-vertexcolor'] = { type: "fragment", data:
		"uniform float ambientIntensity;" +
		"uniform vec3 diffuseColor;" +
		"uniform vec3 emissiveColor;" +
		"uniform float shininess;" +
		"uniform vec3 specularColor;" +
		"uniform float alpha;" +
		"uniform float lightOn;" +
		"uniform sampler2D sh_tex;" +
        "uniform float shadowIntensity;" +
		"" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragColor;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
        "varying vec4 projCoord;" +
		"" +
        "float PCF_Filter(vec3 projectiveBiased, float filterWidth)" +
        "{" +
        "    float stepSize = 2.0 * filterWidth / 3.0;" +
        "    float blockerCount = 0.0;" +
        "    projectiveBiased.x -= filterWidth;" +
        "    projectiveBiased.y -= filterWidth;" +
        "    for (float i=0.0; i<3.0; i++)" +
        "    {" +
        "        for (float j=0.0; j<3.0; j++)" +
        "        {" +
        "            projectiveBiased.x += (j*stepSize);" +
        "            projectiveBiased.y += (i*stepSize);" +
        "            vec4 shCol = texture2D(sh_tex, (1.0+projectiveBiased.xy)*0.5);" +
        "            float z = (shCol.a * 16777216.0 + shCol.r * 65536.0 + shCol.g * 256.0 + shCol.b) / 16777216.0;" +
        "            if (z < projectiveBiased.z) blockerCount += 1.0;" +
        "            projectiveBiased.x -= (j*stepSize);" +
        "            projectiveBiased.y -= (i*stepSize);" +
        "        }" +
        "    }" +
        "    float result = 1.0 - shadowIntensity * blockerCount / 9.0;" +
        "    return result;" +
        "}" +
        "" +
		"void main(void) {" +
		"    vec3 normal = normalize(fragNormal);" +
		"    vec3 light = normalize(fragLightVector);" +
		"    vec3 eye = normalize(fragEyeVector);" +
		"    float diffuse = abs(dot(normal, light)) * lightOn;" +
		"    diffuse += abs(dot(normal, eye));" +
		"    float specular = pow(abs(dot(normal, normalize(light+eye))), shininess*128.0) * lightOn;" +
		"    specular += 0.8 * pow(abs(dot(normal, normalize(eye))), shininess*128.0);" +
		"    vec3 rgb = emissiveColor + diffuse * fragColor + specular * specularColor;" +
		"    rgb = clamp(rgb, 0.0, 1.0);" +
        "    if (shadowIntensity > 0.0) { " +
        "      vec3 projectiveBiased = projCoord.xyz / projCoord.w;" +
        "      float shadowed = PCF_Filter(projectiveBiased, 0.002);" +
        "      rgb *= shadowed;" +
        "    }" +
		"    gl_FragColor = vec4(rgb, alpha);" +
		"}"
		};

    g_shaders['vs-x3d-vertexcolorUnlit'] = { type: "vertex", data:
        "attribute vec3 position;" +
        "attribute vec3 color;" +
        "varying vec3 fragColor;" +
        "uniform mat4 modelViewProjectionMatrix;" +
        "" +
        "void main(void) {" +
        "    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
        "    fragColor = color;" +
        "}"
        };
    
    g_shaders['fs-x3d-vertexcolorUnlit'] = { type: "fragment", data:
        "uniform vec3 diffuseColor;" +
        "uniform float alpha;" +
        "uniform float lightOn;" +
        "varying vec3 fragColor;" +
        "" +
        "void main(void) {" +
        "    gl_FragColor = vec4(fragColor, alpha);" +
        "}"
        };

	g_shaders['fs-x3d-shownormal'] = { type: "fragment", data:
		"uniform float ambientIntensity;" +
		"uniform vec3 diffuseColor;" +
		"uniform vec3 emissiveColor;" +
		"uniform float shininess;" +
		"uniform vec3 specularColor;" +
		"uniform float alpha;" +
		"uniform float lightOn;" +
		"" +
		"varying vec3 fragNormal;" +
		"varying vec3 fragLightVector;" +
		"varying vec3 fragEyeVector;" +
		"varying vec2 fragTexCoord;" +
		"" +
		"void main(void) {" +
		"    vec3 normal = normalize(fragNormal);" +
		"    gl_FragColor = vec4((normal+1.0)/2.0, 1.0);" +
		"}"
		};

	g_shaders['vs-x3d-default'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"uniform mat4 modelViewProjectionMatrix;" +
		"void main(void) {" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"}"
		};

	g_shaders['fs-x3d-default'] = { type: "fragment", data:
		"uniform vec3 diffuseColor;" +
		"void main(void) {" +
		"    gl_FragColor = vec4(diffuseColor, 1.0);" +
		"}"
		};
    
    g_shaders['vs-x3d-pick'] = { type: "vertex", data:
		"attribute vec3 position;" +
        "uniform mat4 modelMatrix;" +
		"uniform mat4 modelViewProjectionMatrix;" +
        "uniform vec3 wcMin;" +
        "uniform vec3 wcMax;" +
        "varying vec3 worldCoord;" +
		"void main(void) {" +
        "    worldCoord = (modelMatrix * vec4(position, 1.0)).xyz;" +
        "    vec3 dia = wcMax - wcMin;" +
        "    worldCoord = worldCoord - wcMin;" +
        "    worldCoord.x /= dia.x;" +
        "    worldCoord.y /= dia.y;" +
        "    worldCoord.z /= dia.z;" +
		"    gl_Position = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"}"
		};

	g_shaders['fs-x3d-pick'] = { type: "fragment", data:
		"uniform float id;" +
        "varying vec3 worldCoord;" +
		"void main(void) {" +
		"    gl_FragColor = vec4(worldCoord, id);" +
		"}"
		};

	g_shaders['vs-x3d-shadow'] = { type: "vertex", data:
		"attribute vec3 position;" +
		"uniform mat4 modelViewProjectionMatrix;" +
        "varying vec4 projCoord;" +
		"void main(void) {" +
        "   projCoord = modelViewProjectionMatrix * vec4(position, 1.0);" +
		"   gl_Position = projCoord;" +
		"}"
		};

	g_shaders['fs-x3d-shadow'] = { type: "fragment", data:
        "varying vec4 projCoord;" +
		"void main(void) {" +
        "    vec3 proj = (projCoord.xyz / projCoord.w);" +
		"    float dist = proj.z * 4294967296.0;" +
        "    float alpha = float(int(dist / 16777216.0));" +
		"    dist = dist - float(int(alpha)) * 16777216.0;" +
		"    float red = float(int(dist / 65536.0));" +
		"    dist = dist - float(int(red)) * 65536.0;" +
		"    float green = float(int(dist / 256.0));" +
        "    dist = dist - float(int(green)) * 256.0;" +
		"    float blue = float(int(dist / 256.0));" +
		"    gl_FragColor = vec4(red/256.0, green/256.0, blue/256.0, alpha/256.0);" +
		"}"
		};
    
	function getDefaultShaderProgram(gl, suffix) 
	{
		var prog = gl.createProgram();
		var vs = gl.createShader(gl.VERTEX_SHADER);
		var fs = gl.createShader(gl.FRAGMENT_SHADER);
		
		gl.shaderSource(vs, g_shaders['vs-x3d-'+suffix].data);
		gl.shaderSource(fs, g_shaders['fs-x3d-'+suffix].data);
		gl.compileShader(vs);
		gl.compileShader(fs);
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		
		var msg = gl.getProgramInfoLog(prog);
		if (msg) {
			x3dom.debug.logError(msg);
        }
		
		return wrapShaderProgram(gl, prog);
	}
	
	function getShaderProgram(gl, ids) 
	{
		var shader = [];
		
		for (var id=0; id<2; id++)
		{
			if (!g_shaders[ids[id]])
			{
				x3dom.debug.logError('Cannot find shader '+ids[id]);
				return;
			}
			
			if (g_shaders[ids[id]].type == 'vertex')
            {
				shader[id] = gl.createShader(gl.VERTEX_SHADER);
            }
			else if (g_shaders[ids[id]].type == 'fragment')
            {
				shader[id] = gl.createShader(gl.FRAGMENT_SHADER);
            }
			else
			{
				x3dom.debug.logError('Invalid shader type '+g_shaders[id].type);
				return;
			}
			
			gl.shaderSource(shader[id], g_shaders[ids[id]].data);
			gl.compileShader(shader[id]);
		}
		
		var prog = gl.createProgram();
		
		gl.attachShader(prog, shader[0]);
		gl.attachShader(prog, shader[1]);
		gl.linkProgram(prog);
		
		var msg = gl.getProgramInfoLog(prog);
		if (msg) {
			x3dom.debug.logError(msg);
        }
		
		return wrapShaderProgram(gl, prog);
	}

	// Returns "shader" such that "shader.foo = [1,2,3]" magically sets the appropriate uniform
	function wrapShaderProgram(gl, sp) 
	{
		var shader = {};
		
		shader.bind = function () { 
            gl.useProgram(sp); 
        };
		
        var loc = null, obj = null;
		var i = 0;
        
        var numUniforms = gl.getProgramParameter(sp, gl.ACTIVE_UNIFORMS);
		
		for (i=0; i < numUniforms; ++i) {
			try {
				obj = gl.getActiveUniform(sp, i);
				//x3dom.debug.logInfo("uniform #" + i + " obj=" + obj.name );
			}
			catch (eu) {}

			if (gl.getError() !== 0) {
				//x3dom.debug.logInfo("GetProgramiv(ACTIVE_UNIFORMS) not implemented, loop until error");
				break;
			}

			loc = gl.getUniformLocation(sp, obj.name);
			
			switch (obj.type) {
				case gl.SAMPLER_2D:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform1i(loc, val); }; })(loc));
					break;
				case gl.SAMPLER_CUBE:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform1i(loc, val); }; })(loc));
					break;
				case gl.BOOL:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform1i(loc, val); }; })(loc));
					break;
				case gl.FLOAT:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform1f(loc, val); }; })(loc));
					break;
				case gl.FLOAT_VEC2:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform2f(loc, val[0], val[1]); }; })(loc));           
					break;
				case gl.FLOAT_VEC3:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform3f(loc, val[0], val[1], val[2]); }; })(loc));
					break;
				case gl.FLOAT_VEC4:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniform4f(loc, val[0], val[1], val[2], val[3]); }; })(loc));
					break;
				case gl.FLOAT_MAT2:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniformMatrix2fv(loc, false, new WebGLFloatArray(val)); }; })(loc));
					break;
				case gl.FLOAT_MAT3:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniformMatrix3fv(loc, false, new WebGLFloatArray(val)); }; })(loc));
					break;
				case gl.FLOAT_MAT4:
					shader.__defineSetter__(obj.name, 
						(function (loc) { return function (val) { gl.uniformMatrix4fv(loc, false, new WebGLFloatArray(val)); }; })(loc));
					break;
				default:
					x3dom.debug.logInfo('GLSL program variable '+obj.name+' has unknown type '+obj.type);
			}
		}
		
        var numAttribs = gl.getProgramParameter(sp, gl.ACTIVE_ATTRIBUTES);
        
		for (i=0; i < numAttribs; ++i) {
			try {
				obj = gl.getActiveAttrib(sp, i);
				//x3dom.debug.logInfo("attribute #" + i + " obj=" + obj.name );
			}
			catch (ea) {}
			
			if (gl.getError() !== 0) {
				//x3dom.debug.logInfo("GetProgramiv(ACTIVE_ATTRIBUTES) not implemented, loop until error");
				break;	
			}

			loc = gl.getAttribLocation(sp, obj.name);
			shader[obj.name] = loc;
		}
		
		return shader;
	}
    
	Context.prototype.setupShape = function (gl, shape) 
	{
        if (shape._webgl !== undefined)
        {
            if (shape._dirty.positions === true)
            {
                if (shape._webgl.shader.position !== undefined) 
                {
                    shape._webgl.positions = shape._cf.geometry.node._mesh._positions;
                    
                    // TODO; don't delete but use glMapBuffer() and DYNAMIC_DRAW
                    gl.deleteBuffer(shape._webgl.buffers[1]);
                    
                    var positionBuffer = gl.createBuffer();
                    shape._webgl.buffers[1] = positionBuffer;
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    
                    var vertices = new WebGLFloatArray(shape._webgl.positions);
                    
                    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    
                    gl.vertexAttribPointer(shape._webgl.shader.position, 3, gl.FLOAT, false, 0, 0);
                    
                    delete vertices;
                }
                
                shape._dirty.positions = false;
            }
            if (shape._dirty.colors === true)
            {
                if (shape._webgl.shader.color !== undefined)
                {
                    shape._webgl.colors = shape._cf.geometry.node._mesh._colors;
                    
                    gl.deleteBuffer(shape._webgl.buffers[4]);
                    
                    var colorBuffer = gl.createBuffer();
                    shape._webgl.buffers[4] = colorBuffer;
                    
                    var colors = new WebGLFloatArray(shape._webgl.colors);
                    
                    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);				
                    
                    gl.vertexAttribPointer(shape._webgl.shader.color, 3, gl.FLOAT, false, 0, 0); 
                    
                    delete colors;
                }
                
                shape._dirty.colors = false;
            }
            if (shape._dirty.texture === true)
            {
                if (shape._webgl.texture !== undefined)
                {
                	var tex = shape._cf.appearance.node._cf.texture.node;
                    if (tex) {
                        shape.updateTexture(tex);
                    }
                }
                
                shape._dirty.texture = false;
            }
            //TODO; check all other cases, too!
            
            return;
        }
        
        // we're on init, thus reset all dirty flags
        shape._dirty.positions = false;
		shape._dirty.normals = false;
		shape._dirty.texcoords = false;
        shape._dirty.colors = false;
		shape._dirty.indexes = false;
		shape._dirty.texture = false;
        
        // TODO; finish text!
		if (x3dom.isa(shape._cf.geometry.node, x3dom.nodeTypes.Text)) 
        {
			//var text_canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
            var text_canvas = document.createElement('canvas');
            text_canvas.width = 600;
            text_canvas.height = 100;
            //document.body.appendChild(text_canvas);	//dbg
            
			var text_ctx = text_canvas.getContext('2d');
			var fontStyle = shape._cf.geometry.node._cf.fontStyle.node;
			var font_family = 'SANS';
            if (fontStyle !== null) {
                font_family = Array.map(fontStyle._vf.family, function (s) {
                    if (s == 'SANS') { return 'sans-serif'; }
                    else if (s == 'SERIF') { return 'serif'; }
                    else if (s == 'TYPEWRITER') { return 'monospace'; }
                    else { return '"'+s+'"'; }  //'Verdana' 
                }).join(', ');
            }
			/*text_ctx.mozTextStyle = '48px '+font_family;*/
            
			var string = shape._cf.geometry.node._vf.string;
			/*
			var text_w = 0;
            var i = 0;
            for (i = 0; i < string.length; ++i) {
				text_w = Math.max(text_w, text_ctx.mozMeasureText(string[i]));
            }
            */
            
            text_ctx.fillStyle = 'rgb(0,0,0)';
            text_ctx.fillRect(0, 0, text_ctx.canvas.width, text_ctx.canvas.height);
             
            // write white text with black border
            text_ctx.fillStyle = 'white';
            text_ctx.lineWidth = 2.5;
            text_ctx.strokeStyle = 'grey';
            text_ctx.save();
            text_ctx.font = "32px " + font_family;  //bold 
            var txtW = text_ctx.measureText(string).width;
            var txtH = text_ctx.measureText(string).height || 42;
            var leftOffset = (text_ctx.canvas.width - txtW) / 2.0;
            var topOffset = (text_ctx.canvas.height - 32) / 2.0;
            //text_ctx.strokeText(string, leftOffset, topOffset);
            text_ctx.fillText(string, leftOffset, topOffset);
            text_ctx.restore();
            
            /*
			var line_h = 1.2 * text_ctx.mozMeasureText('M'); // XXX: this is a hacky guess
			var text_h = line_h * shape._cf.geometry.node._string.length;
			text_canvas.width = Math.pow(2, Math.ceil(Math.log(text_w)/Math.log(2)));
			text_canvas.height = Math.pow(2, Math.ceil(Math.log(text_h)/Math.log(2)));
			text_ctx.fillStyle = '#000';
			text_ctx.translate(0, line_h);
			for (i = 0; i < string.length; ++i) {
				text_ctx.mozDrawText(string[i]);
				text_ctx.translate(0, line_h);
			}
            */
			
			var ids = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, ids);
			gl.texImage2D(gl.TEXTURE_2D, 0, text_canvas);
            
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
            gl.bindTexture(gl.TEXTURE_2D, null);
			
			var w = txtW/100.0; //txtW/txtH;
			var h = txtH/100.0;
            var u0 = leftOffset / text_canvas.width;
			var u = u0 + txtW / text_canvas.width;
			var v = 1 - txtH / text_canvas.height;
            var v0 = topOffset / text_canvas.height + v;
            if (u0 < 0) { u0 = 0; }
            if (u > 1) { u = 1; }
            //x3dom.debug.logInfo(txtW + ", " + txtH + "; " + u0 + ", " + v0 + "; " + u + ", " + v);
            
            shape._cf.geometry.node._mesh._positions = [-w,-h,0, w,-h,0, w,h,0, -w,h,0];
			shape._cf.geometry.node._mesh._normals = [0,0,1, 0,0,1, 0,0,1, 0,0,1];
			shape._cf.geometry.node._mesh._texCoords = [u0,v, u,v, u,v0, u0,v0];
			shape._cf.geometry.node._mesh._colors = [];
			shape._cf.geometry.node._mesh._indices = [0,1,2, 2,3,0];
            shape._cf.geometry.node._mesh._invalidate = true;
                
			shape._webgl = {
				positions: shape._cf.geometry.node._mesh._positions,
				normals: shape._cf.geometry.node._mesh._normals,
				texcoords: shape._cf.geometry.node._mesh._texCoords,
                colors: shape._cf.geometry.node._mesh._colors,
				indexes: shape._cf.geometry.node._mesh._indices,
				texture: ids,
                buffers: [{},{},{},{},{}]
			};

            shape._webgl.primType = gl.TRIANGLES;
			shape._webgl.shader = getShaderProgram(gl, ['vs-x3d-textured', 'fs-x3d-textured-txt']);
		}
		else 
		{
            var context = this;
			var tex = shape._cf.appearance.node._cf.texture.node;
            
            shape.updateTexture = function(tex)
            {
                var texture = gl.createTexture();
                var that = this;
                
                if (x3dom.isa(tex, x3dom.nodeTypes.MovieTexture))
                {
                    tex._video = document.createElement('video');
                    tex._video.setAttribute('autobuffer', 'true');
                    //tex._video.setAttribute('src', tex._vf.url);
                    var p = document.getElementsByTagName('body')[0];
                    p.appendChild(tex._video);
                    tex._video.style.display = "none";
                    
                    for (var i=0; i<tex._vf.url.length; i++)
                    {
                        var videoUrl = tex._nameSpace.getURL(tex._vf.url[i]);
                        x3dom.debug.logInfo('Adding video file: ' + videoUrl);
                        var src = document.createElement('source');
                        src.setAttribute('src', videoUrl);
                        tex._video.appendChild(src);
                    }
                    
                    var updateMovie = function()
                    {
						that._nameSpace.doc.needRender = true;			
	
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.texImage2D(gl.TEXTURE_2D, 0, tex._video, false);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
                        //gl.generateMipmap(gl.TEXTURE_2D);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    };
                    
                    var startVideo = function()
                    {
						that._nameSpace.doc.needRender = true;			
						
                        that._webgl.texture = texture;
                        //x3dom.debug.logInfo(texture + " video tex url: " + tex._vf.url);
                        
                        tex._video.play();
                        tex._intervalID = setInterval(updateMovie, 16);
                    };
                    
                    var videoDone = function()
                    {
                        clearInterval(tex._intervalID);
                        
                        if (tex._vf.loop === true)
                        {
                            tex._video.play();
                            tex._intervalID = setInterval(updateMovie, 16);
                        }
                    };
                    
                    // Start listening for the canplaythrough event, so we do not
                    // start playing the video until we can do so without stuttering
                    tex._video.addEventListener("canplaythrough", startVideo, true);

                    // Start listening for the ended event, so we can stop the
                    // texture update when the video is finished playing
                    tex._video.addEventListener("ended", videoDone, true);
                }
                else if (x3dom.isa(tex, x3dom.nodeTypes.X3DEnvironmentTextureNode))
                {
                    texture = context.loadCubeMap(gl, tex.getTexUrl(), that._nameSpace.doc );
                    that._webgl.texture = texture;
                }
                else
                {
                    var image = new Image();
                    image.src = tex._nameSpace.getURL(tex._vf.url[0]);
                    
                    image.onload = function()
                    {
						that._nameSpace.doc.needRender = true;
                        that._webgl.texture = texture;
                        //x3dom.debug.logInfo(texture + " load tex url: " + tex._vf.url);
                        
                        gl.bindTexture(gl.TEXTURE_2D, texture);
                        gl.texImage2D(gl.TEXTURE_2D, 0, image);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        //gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
                        //gl.generateMipmap(gl.TEXTURE_2D);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                    };
                }
            };
			
			shape._webgl = {
				positions: shape._cf.geometry.node._mesh._positions,
				normals: shape._cf.geometry.node._mesh._normals,
				texcoords: shape._cf.geometry.node._mesh._texCoords,
				colors: shape._cf.geometry.node._mesh._colors,
				indexes: shape._cf.geometry.node._mesh._indices,
				//indicesBuffer,positionBuffer,normalBuffer,texcBuffer,colorBuffer
				buffers: [{},{},{},{},{}]
			};
            
            if (tex) {
                shape.updateTexture(tex);
			}
            
            if (x3dom.isa(shape._cf.geometry.node, x3dom.nodeTypes.PointSet)) {
                shape._webgl.primType = gl.POINTS;
                
                //TODO; remove these hacky thousands of shaders!!!
                shape._webgl.shader = getShaderProgram(gl, ['vs-x3d-vertexcolorUnlit', 'fs-x3d-vertexcolorUnlit']);
            }
            else {
                //TODO; also account for other cases such as LineSet
                shape._webgl.primType = gl.TRIANGLES;
                
                /** SHADER HACK (TODO: MAKE BETTER!) */
                if (shape._cf.appearance.node._shader !== null) {
                    //FIXME; HACK
                    g_shaders['vs-x3d-HACK'] = {};
                    g_shaders['vs-x3d-HACK'].type = "vertex";
                    g_shaders['vs-x3d-HACK'].data = shape._cf.appearance.node._shader._vertex._vf.url[0];
                    g_shaders['fs-x3d-HACK'] = {};
                    g_shaders['fs-x3d-HACK'].type = "fragment";
                    g_shaders['fs-x3d-HACK'].data = shape._cf.appearance.node._shader._fragment._vf.url[0];
                
                	shape._webgl.shader = getDefaultShaderProgram(gl, 'HACK');
                    //END OF HACK
                }
                else {
                /** BEGIN STANDARD MATERIAL */
                // 'fs-x3d-untextured'],  //'fs-x3d-shownormal'],
                if (tex) {
                    if (shape._cf.appearance.node._cf.textureTransform.node === null) {
                        shape._webgl.shader = getShaderProgram(gl, ['vs-x3d-textured', 'fs-x3d-textured']);
                    }
                    else {
                        shape._webgl.shader = getShaderProgram(gl, ['vs-x3d-textured-tt', 'fs-x3d-textured']);
                    }
                }
                else if (shape._cf.geometry.node._mesh._colors.length > 0) {
                    shape._webgl.shader = getShaderProgram(gl, ['vs-x3d-vertexcolor', 'fs-x3d-vertexcolor']);
                }
                else {
                    shape._webgl.shader = getShaderProgram(gl, ['vs-x3d-untextured', 'fs-x3d-untextured']);
                }
                /** END STANDARD MATERIAL */
                }
            }
        }
		
        var sp = shape._webgl.shader;
        
        if (sp.position !== undefined) 
        {
            var positionBuffer = gl.createBuffer();
            shape._webgl.buffers[1] = positionBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            var vertices = new WebGLFloatArray(shape._webgl.positions);
            
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
            //gl.enableVertexAttribArray(sp.position);
            
            // bind indices for drawElements() call
            var indicesBuffer = gl.createBuffer();
            shape._webgl.buffers[0] = indicesBuffer;
            
            var indexArray = new WebGLUnsignedShortArray(shape._webgl.indexes);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
            
            delete vertices;
            delete indexArray;
        }
        if (sp.normal !== undefined) 
        {
            var normalBuffer = gl.createBuffer();
            shape._webgl.buffers[2] = normalBuffer;
            
            var normals = new WebGLFloatArray(shape._webgl.normals);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);				
            
            gl.vertexAttribPointer(sp.normal, 3, gl.FLOAT, false, 0, 0); 
            //gl.enableVertexAttribArray(sp.normal);
            
            delete normals;
        }
        if (sp.texcoord !== undefined)
        {
            var texcBuffer = gl.createBuffer();
            shape._webgl.buffers[3] = texcBuffer;
            
            var texCoords = new WebGLFloatArray(shape._webgl.texcoords);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, texcBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
            
            gl.vertexAttribPointer(sp.texcoord, 
                shape._cf.geometry.node._mesh._numTexComponents, gl.FLOAT, false, 0, 0); 
            //gl.enableVertexAttribArray(sp.texcoord);
            
            delete texCoords;
        }
        if (sp.color !== undefined)
        {
            var colorBuffer = gl.createBuffer();
            shape._webgl.buffers[4] = colorBuffer;
            
            var colors = new WebGLFloatArray(shape._webgl.colors);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);				
            
            gl.vertexAttribPointer(sp.color, 3, gl.FLOAT, false, 0, 0); 
            //gl.enableVertexAttribArray(sp.color);
            
            delete colors;
        }
	};
    
    // mainly manages rendering of backgrounds and buffer clearing
	Context.prototype.setupScene = function(gl, scene) 
	{
        if (scene._webgl !== undefined) {
            return;
        }
        
        var url = scene.getSkyColor()[1];
        var i = 0;
        var w = 1, h = 1;
        
        if (url.length > 0 && url[0].length > 0)
        {
            if (url.length >= 6 && url[1].length > 0 && url[2].length > 0 && 
                url[3].length > 0 && url[4].length > 0 && url[5].length > 0)
            {
                var sphere = new x3dom.nodeTypes.Sphere();
                
                scene._webgl = {
                    positions: sphere._mesh._positions,
                    indexes: sphere._mesh._indices,
                    buffers: [{}, {}]
                };
                
                scene._webgl.primType = gl.TRIANGLES;
                scene._webgl.shader = getShaderProgram(gl, ['vs-x3d-bg-textureCube', 'fs-x3d-bg-textureCube']);
                
                scene._webgl.texture = this.loadCubeMap(gl, url, scene._nameSpace.doc);
            }
            else
            {
                var texture = gl.createTexture();
                
                var image = new Image();
                image.src = url[0];
                
                image.onload = function()
                {
					scene._nameSpace.doc.needRender = true;
                    scene._webgl.texture = texture;
                    //x3dom.debug.logInfo(texture + " load tex url: " + url[0]);
                    
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, image, true);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                };
                
                scene._webgl = {
                    positions: [-w,-h,0, -w,h,0, w,-h,0, w,h,0],
                    indexes: [0, 1, 2, 3],
                    buffers: [{}, {}]
                };

                scene._webgl.primType = gl.TRIANGLE_STRIP;
                scene._webgl.shader = getShaderProgram(gl, ['vs-x3d-bg-texture', 'fs-x3d-bg-texture']);
            }
		}
		else 
		{
            // TODO; impl. gradient bg etc., e.g. via canvas 2d?
            scene._webgl = {};
        }
        
        // setup dbg fgnds
        (function () {
            scene._fgnd = {};
            
            scene._fgnd._webgl = {
                positions: [-w,-h,0, -w,h,0, w,-h,0, w,h,0],
                indexes: [0, 1, 2, 3],
                buffers: [{}, {}]
            };

            scene._fgnd._webgl.primType = gl.TRIANGLE_STRIP;
            scene._fgnd._webgl.shader = getShaderProgram(gl, ['vs-x3d-bg-texture', 'fs-x3d-bg-texture']);
            
            var sp = scene._fgnd._webgl.shader;
            
            var positionBuffer = gl.createBuffer();
            scene._fgnd._webgl.buffers[1] = positionBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            var vertices = new WebGLFloatArray(scene._fgnd._webgl.positions);
            
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
            
            var indicesBuffer = gl.createBuffer();
            scene._fgnd._webgl.buffers[0] = indicesBuffer;
            
            var indexArray = new WebGLUnsignedShortArray(scene._fgnd._webgl.indexes);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
            
            delete vertices;
            delete indexArray;
            
            scene._fgnd._webgl.render = function(gl, tex)
            {
                scene._fgnd._webgl.texture = tex;
                
                gl.frontFace(gl.CCW);
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.DEPTH_TEST);
                
                sp.bind();
                if (!sp.tex) {
                    sp.tex = 0;
                }
                
                gl.enable(gl.TEXTURE_2D);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, scene._fgnd._webgl.texture);
                
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene._fgnd._webgl.buffers[0]);
                gl.bindBuffer(gl.ARRAY_BUFFER, scene._fgnd._webgl.buffers[1]);
                gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(sp.position);
                
                try {
                    gl.drawElements(scene._fgnd._webgl.primType, 
                                    scene._fgnd._webgl.indexes.length, gl.UNSIGNED_SHORT, 0);
                }
                catch(e) {
                    x3dom.debug.logException("render background: " + e);
                }
                
                gl.disableVertexAttribArray(sp.position);
                
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, null);
                gl.disable(gl.TEXTURE_2D);
            };
        })();
        
        if (scene._webgl.shader)
		{
            var sp = scene._webgl.shader;
            
            var positionBuffer = gl.createBuffer();
            scene._webgl.buffers[1] = positionBuffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            var vertices = new WebGLFloatArray(scene._webgl.positions);
            
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            
            gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
            
            var indicesBuffer = gl.createBuffer();
            scene._webgl.buffers[0] = indicesBuffer;
            
            var indexArray = new WebGLUnsignedShortArray(scene._webgl.indexes);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
            
            delete vertices;
            delete indexArray;
        }
        
        scene._webgl.render = function(gl)
        {
            if (!scene._webgl.texture || 
                (scene._webgl.texture.textureCubeReady !== undefined && 
                 scene._webgl.texture.textureCubeReady !== true))
            {
                var bgCol = scene.getSkyColor()[0];
                
                gl.clearColor(bgCol[0], bgCol[1], bgCol[2], bgCol[3]);
                gl.clearDepth(1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            }
            else
            {
                gl.clearDepth(1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
                
                gl.frontFace(gl.CCW);
                gl.disable(gl.CULL_FACE);
                gl.disable(gl.DEPTH_TEST);
                gl.disable(gl.BLEND);
                
                sp.bind();
                if (!sp.tex) {
                    sp.tex = 0;
                }
                
                if (scene._webgl.texture.textureCubeReady) {
                    sp.modelViewProjectionMatrix = scene.getWCtoCCMatrix().toGL();
                    
                    gl.enable(gl.TEXTURE_CUBE_MAP);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, scene._webgl.texture);
                    
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                }
                else {
                    gl.enable(gl.TEXTURE_2D);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, scene._webgl.texture);
                    
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                }
                
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene._webgl.buffers[0]);
				gl.bindBuffer(gl.ARRAY_BUFFER, scene._webgl.buffers[1]);
				gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(sp.position);
                
                try {
                    gl.drawElements(scene._webgl.primType, scene._webgl.indexes.length, gl.UNSIGNED_SHORT, 0);
                }
                catch(e) {
                    x3dom.debug.logException("render background: " + e);
                }
                
                gl.disableVertexAttribArray(sp.position);
                
                if (scene._webgl.texture.textureCubeReady) {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                    gl.disable(gl.TEXTURE_CUBE_MAP);
                }
                else {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                    gl.disable(gl.TEXTURE_2D);
                }
                
                gl.clear(gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
            }
        };
	};
    
    
    Context.prototype.renderShadowPass = function(gl, scene, mat_light, mat_scene)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, scene._webgl.fboShadow.fbo);
        
        gl.viewport(0, 0, scene._webgl.fboShadow.width, scene._webgl.fboShadow.height);
        
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.depthFunc(gl.LEQUAL);
		gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        
        var sp = scene._webgl.shadowShader;
        sp.bind();
        
        //var mat_light = scene.getLightMatrix();
        //var mat_scene = scene.getWCtoLCMatrix();
        var i, n = scene.drawableObjects.length;
        
        for (i=0; i<n; i++)
        {
			var trafo = scene.drawableObjects[i][0];
			var shape = scene.drawableObjects[i][1];
            
			sp.modelViewMatrix = mat_light.mult(trafo).toGL();
			sp.modelViewProjectionMatrix = mat_scene.mult(trafo).toGL();
            
            if (sp.position !== undefined) 
			{
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape._webgl.buffers[0]);
				
				gl.bindBuffer(gl.ARRAY_BUFFER, shape._webgl.buffers[1]);
				
				gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(sp.position);
			}
            
            try {
                gl.drawElements(shape._webgl.primType, shape._webgl.indexes.length, gl.UNSIGNED_SHORT, 0);
            }
            catch (e) {
                x3dom.debug.logException(shape._DEF + " renderShadowPass(): " + e);
            }
            
			if (sp.position !== undefined) {
				gl.disableVertexAttribArray(sp.position);
			}
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    
    
    Context.prototype.renderPickingPass = function(gl, scene, mat_view, mat_scene, min, max)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, scene._webgl.fboPick.fbo);
        
        gl.viewport(0, 0, scene._webgl.fboPick.width, scene._webgl.fboPick.height);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.depthFunc(gl.LEQUAL);
		gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        
        var sp = scene._webgl.pickShader;
        sp.bind();
        
        var i, n = scene.drawableObjects.length;
        
        for (i=0; i<n; i++)
        {
			var trafo = scene.drawableObjects[i][0];
			var shape = scene.drawableObjects[i][1];
            
            sp.modelMatrix = trafo.toGL();
			//sp.modelMatrix = mat_view.mult(trafo).toGL();
			sp.modelViewProjectionMatrix = mat_scene.mult(trafo).toGL();
            
            sp.wcMin = min.toGL();
            sp.wcMax = max.toGL();
            sp.id = 1.0 - shape._objectID / 255.0;   //FIXME; allow more than 255 objects!
            
            if (sp.position !== undefined) 
			{
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape._webgl.buffers[0]);
				
				gl.bindBuffer(gl.ARRAY_BUFFER, shape._webgl.buffers[1]);
				
				gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(sp.position);
			}
            
            try {
                gl.drawElements(shape._webgl.primType, shape._webgl.indexes.length, gl.UNSIGNED_SHORT, 0);
            }
            catch (e) {
                x3dom.debug.logException(shape._DEF + " renderPickingPass(): " + e);
            }
            
			if (sp.position !== undefined) {
				gl.disableVertexAttribArray(sp.position);
			}
        }
        
        var data = gl.readPixels(//0, 0, scene._webgl.fboPick.width, scene._webgl.fboPick.height, 
                                 scene._lastX * scene._webgl.pickScale, 
                                 scene._webgl.fboPick.height - 1 - scene._lastY * scene._webgl.pickScale, 
                                 1, 1, gl.RGBA, gl.UNSIGNED_BYTE);
		if (data.data) { data = data.data };
        scene._webgl.fboPick.pixelData = data;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    

	Context.prototype.renderScene = function (scene, pick) 
	{
		var gl = this.ctx3d;
        
        if (gl === null || scene === null)
        {
            return;
        }
        
		if (!scene._webgl)
        {
            this.setupScene(gl, scene);
            
            // scale factor for mouse coords and width/ height (low res for speed-up)
            scene._webgl.pickScale = 0.5;
            scene._webgl.fboPick = this.initFbo(gl, 
                        this.canvas.width  * scene._webgl.pickScale, 
                        this.canvas.height * scene._webgl.pickScale, true);
            scene._webgl.fboPick.pixelData = null;
            scene._webgl.pickShader = getDefaultShaderProgram(gl, 'pick');
            
            scene._webgl.fboShadow = this.initFbo(gl, 1024, 1024, false);
            scene._webgl.shadowShader = getDefaultShaderProgram(gl, 'shadow');
		}
        
        var t0, t1;
		
		// render traversal
		if (scene.drawableObjects === undefined || !scene.drawableObjects)
        {
			scene.drawableObjects = [];
            scene.drawableObjects.LODs = [];
			
			t0 = new Date().getTime();
			
			scene.collectDrawableObjects(x3dom.fields.SFMatrix4f.identity(), scene.drawableObjects);
			
			t1 = new Date().getTime() - t0;
			
			if (this.canvas.parent.statDiv) {
				this.canvas.parent.statDiv.appendChild(document.createElement("br"));
				this.canvas.parent.statDiv.appendChild(document.createTextNode("traverse: " + t1));
			}
		}
        
        var mat_view = scene.getViewMatrix();
        var mat_scene = scene.getWCtoCCMatrix();
        
		// sorting and stuff
		t0 = new Date().getTime();
		
		// do z-sorting for transparency (currently no separate transparency list)
		var zPos = [];
        var i, n = scene.drawableObjects.length;
        var center, trafo, obj3d;
        
		for (i=0; i<n; i++)
		{
			trafo = scene.drawableObjects[i][0];
			obj3d = scene.drawableObjects[i][1];
            
            // do also init of GL objects
            this.setupShape(gl, obj3d);
			
			center = obj3d.getCenter();
			center = trafo.multMatrixPnt(center);
			center = mat_view.multMatrixPnt(center);
            
			zPos[i] = [i, center.z];
		}
		zPos.sort(function(a, b) { return a[1] - b[1]; });
        
        n = scene.drawableObjects.LODs.length;
        if (n) {
            center = new x3dom.fields.SFVec3f(0, 0, 0); // eye
            center = mat_view.inverse().multMatrixPnt(center);
        }
        
        for (i=0; i<n; i++)
		{
			trafo = scene.drawableObjects.LODs[i][0];
			obj3d = scene.drawableObjects.LODs[i][1];
            
            if (obj3d) {
                obj3d._eye = trafo.inverse().multMatrixPnt(center);
            }
		}
		
		t1 = new Date().getTime() - t0;
		
		if (this.canvas.parent.statDiv) {
			this.canvas.parent.statDiv.appendChild(document.createElement("br"));
			this.canvas.parent.statDiv.appendChild(document.createTextNode("sort: " + t1));
		}
        
        // render color-buf pass for picking
        if (pick)
        {
            //t0 = new Date().getTime();
            
            // TODO; optimize call by reusing calculated volume!
            var min = x3dom.fields.SFVec3f.MAX();
            var max = x3dom.fields.SFVec3f.MIN();
            scene.getVolume(min, max, true);
            
            t0 = new Date().getTime();
            
            this.renderPickingPass(gl, scene, mat_view, mat_scene, min, max);
            
            scene._updatePicking = false;
            
            //var index = ( (scene._webgl.fboPick.height - 1 - scene._lastY) * 
            //               scene._webgl.fboPick.width + scene._lastX ) * 4;
            var index = 0;
            if (index >= 0 && index < scene._webgl.fboPick.pixelData.length) {
                var pickPos = new x3dom.fields.SFVec3f(0, 0, 0);
                pickPos.x = scene._webgl.fboPick.pixelData[index + 0] / 255;
                pickPos.y = scene._webgl.fboPick.pixelData[index + 1] / 255;
                pickPos.z = scene._webgl.fboPick.pixelData[index + 2] / 255;
                
                pickPos = pickPos.multComponents(max.subtract(min)).add(min);
                var objId = 255 - scene._webgl.fboPick.pixelData[index + 3];
                //x3dom.debug.logInfo(pickPos + " / " + objId);
                
                if (objId > 0) {
                    //x3dom.debug.logInfo(x3dom.nodeTypes.Shape.idMap.nodeID[objId]._DEF + " // " +
                    //                    x3dom.nodeTypes.Shape.idMap.nodeID[objId]._xmlNode.localName);
                    scene._pickingInfo.pickPos = pickPos;
                    scene._pickingInfo.pickObj = x3dom.nodeTypes.Shape.idMap.nodeID[objId];
                }
                scene._pickingInfo.updated = true;               
            }
            
            t1 = new Date().getTime() - t0;
            x3dom.debug.logInfo("Picking time (idBuf): " + t1 + "ms");
        }
        //
		
		//TODO; allow for more than one additional light per scene
		var light, lightOn, shadowIntensity;
		var slights = scene.getLights();
		if (slights.length > 0)
        {
            //FIXME; allow more than only one light and also other types
			light = slights[0]._vf.direction;
            lightOn = (slights[0]._vf.on === true) ? 1.0 : 0.0;
            lightOn *= slights[0]._vf.intensity;
            shadowIntensity = (slights[0]._vf.on === true) ? 1.0 : 0.0;
            shadowIntensity *= slights[0]._vf.shadowIntensity;
		}
		else
        {
			light = new x3dom.fields.SFVec3f(0, -1, 0);
            lightOn = 0.0;
            shadowIntensity = 0.0;
		}
		light = mat_view.multMatrixVec(light);
        
        if (shadowIntensity > 0) 
        {
            t0 = new Date().getTime();
            
            var lightMatrix = scene.getLightMatrix();
            var mat_light = scene.getWCtoLCMatrix(lightMatrix);
            
            this.renderShadowPass(gl, scene, lightMatrix, mat_light);
            
            t1 = new Date().getTime() - t0;
            
            if (this.canvas.parent.statDiv) {
                this.canvas.parent.statDiv.appendChild(document.createElement("br"));
                this.canvas.parent.statDiv.appendChild(document.createTextNode("shadow: " + t1));
            }
        }
		
        // rendering
		t0 = new Date().getTime();
        
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		
        // calls gl.clear etc. (bgnd stuff)
        scene._webgl.render(gl);
		
		gl.depthFunc(gl.LEQUAL);
		gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        
        //gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
        //gl.enable(gl.SAMPLE_COVERAGE);
        //gl.sampleCoverage(0.5, false);
		
		//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        //Workaround for WebKit & Co.
        gl.blendFuncSeparate(
					gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,
					//gl.ONE_MINUS_DST_ALPHA, gl.ONE
                    gl.ONE, gl.ONE
                    //gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA
                );
        gl.enable(gl.BLEND);
		
		for (i=0, n=zPos.length; i<n; i++)
		{
			var obj = scene.drawableObjects[zPos[i][0]];
			
			var transform = obj[0];
			var shape = obj[1];
            
			var sp = shape._webgl.shader;
			if (!sp) {
                shape._webgl.shader = getDefaultShaderProgram(gl, 'default');
                sp = shape._webgl.shader;
            }
			sp.bind();

			sp.eyePosition = [0, 0, 0];
			sp.lightDirection = light.toGL();
            sp.lightOn = lightOn;

			var mat = shape._cf.appearance.node._cf.material.node;
			if (mat) {
				sp.ambientIntensity = mat._vf.ambientIntensity;
				sp.diffuseColor = mat._vf.diffuseColor.toGL();
				sp.emissiveColor = mat._vf.emissiveColor.toGL();
				sp.shininess = mat._vf.shininess;
				sp.specularColor = mat._vf.specularColor.toGL();
				sp.alpha = 1.0 - mat._vf.transparency;
			}
            
            var userShader = shape._cf.appearance.node._shader;
            if (userShader) {
                for (var fName in userShader._vf) {
                	if (userShader._vf.hasOwnProperty(fName) && fName !== 'language') {
                    	var field = userShader._vf[fName];
                        try {
                            sp[fName] = field.toGL();
                        }
                        catch(noToGl) {
                            sp[fName] = field;
                        }
                    }
                }
            }
            
            // transformation matrices
			sp.modelViewMatrix = mat_view.mult(transform).toGL();
			sp.modelViewProjectionMatrix = mat_scene.mult(transform).toGL();
			
			if (shape._webgl.texture !== undefined && shape._webgl.texture)
			{
                var tex = shape._cf.appearance.node._cf.texture.node;
                var wrapS = gl.REPEAT, wrapT = gl.REPEAT;
                if (tex && tex._vf.repeatS === false) {
                    wrapS = gl.CLAMP_TO_EDGE;
                }
                if (tex && tex._vf.repeatT === false) {
                    wrapT = gl.CLAMP_TO_EDGE;
                }
                
                if (x3dom.isa(tex, x3dom.nodeTypes.X3DEnvironmentTextureNode) && 
                    shape._webgl.texture.textureCubeReady)
                {
                    gl.enable(gl.TEXTURE_CUBE_MAP);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, shape._webgl.texture);
                    
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrapS);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrapT);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
                else
                {
                    gl.enable(gl.TEXTURE_2D);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, shape._webgl.texture);
                    
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    //gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
                    //gl.generateMipmap(gl.TEXTURE_2D);
                }
                
                if (shape._cf.appearance.node._cf.textureTransform.node !== null)
                {
                    // use shader/ calculation due to performance issues
                    var texTrafo = shape._cf.appearance.node.transformMatrix();
                    sp.texTrafoMatrix = texTrafo.toGL();
                }
                
                if (shape._cf.geometry.node._cf.texCoord !== undefined &&
                    shape._cf.geometry.node._cf.texCoord.node !== null &&
                    shape._cf.geometry.node._cf.texCoord.node._vf.mode)
                {
                    var texMode = shape._cf.geometry.node._cf.texCoord.node._vf.mode;
                    if (texMode.toLowerCase() == "sphere") {
                        sp.sphereMapping = 1.0;
                    }
                    else {
                        sp.sphereMapping = 0.0;
                    }
                }
                else {
                    sp.sphereMapping = 0.0;
                }
                if (!sp.tex) {
                    sp.tex = 0;
                }
			}
            
            if (shadowIntensity > 0) 
            {
                if (!sp.sh_tex) {
                    sp.sh_tex = 1;
                }
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D,scene._webgl.fboShadow.tex);
                
                gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                //gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                //gl.generateMipmap(gl.TEXTURE_2D);
                
                sp.matPV = mat_light.mult(transform).toGL();
            }
            sp.shadowIntensity = shadowIntensity;
            
			
			if (sp.position !== undefined) 
			{
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shape._webgl.buffers[0]);
				
				gl.bindBuffer(gl.ARRAY_BUFFER, shape._webgl.buffers[1]);
				
				gl.vertexAttribPointer(sp.position, 3, gl.FLOAT, false, 0, 0);
				gl.enableVertexAttribArray(sp.position);
			}
			if (sp.normal !== undefined) 
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, shape._webgl.buffers[2]);			
				
				gl.vertexAttribPointer(sp.normal, 3, gl.FLOAT, false, 0, 0); 
				gl.enableVertexAttribArray(sp.normal);
			}
			if (sp.texcoord !== undefined)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, shape._webgl.buffers[3]);
				
				gl.vertexAttribPointer(sp.texcoord, 
                    shape._cf.geometry.node._mesh._numTexComponents, gl.FLOAT, false, 0, 0); 
				gl.enableVertexAttribArray(sp.texcoord);
			}
			if (sp.color !== undefined)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, shape._webgl.buffers[4]);
				
				gl.vertexAttribPointer(sp.color, 3, gl.FLOAT, false, 0, 0); 
				gl.enableVertexAttribArray(sp.color);
			}
			
			if (shape.isSolid()) {
				gl.enable(gl.CULL_FACE);
                
                if (shape.isCCW()) {
                    gl.frontFace(gl.CCW);
                }
                else {
                    gl.frontFace(gl.CW);
                }
            }
			else {
				gl.disable(gl.CULL_FACE);
            }
            
            // render object
            try {
			  // fixme; scene._points is dynamic and doesn't belong there!!!
			  if (scene._points !== undefined && scene._points) {
			    gl.drawElements(gl.POINTS, shape._webgl.indexes.length, gl.UNSIGNED_SHORT, 0);
              }
			  else {
                // fixme; this differentiation isn't nice, but otherwise WebGL seems to run out of mem
                if (shape._webgl.primType == gl.POINTS) {
                    gl.drawArrays(gl.POINTS, 0, shape._webgl.positions.length/3);
                }
                else {
                    gl.drawElements(shape._webgl.primType, shape._webgl.indexes.length, gl.UNSIGNED_SHORT, 0);
                }
              }
            }
            catch (e) {
                x3dom.debug.logException(shape._DEF + " renderScene(): " + e);
            }
			
			if (shape._webgl.texture !== undefined && shape._webgl.texture)
			{
                if (x3dom.isa(tex, x3dom.nodeTypes.X3DEnvironmentTextureNode) && 
                    shape._webgl.texture.textureCubeReady)
                {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                    gl.disable(gl.TEXTURE_CUBE_MAP);
                }
                else
                {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
                
                if (shadowIntensity > 0) 
                {
                    gl.activeTexture(gl.TEXTURE1);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
				gl.disable(gl.TEXTURE_2D);
			}
			
			if (sp.position !== undefined) {
				gl.disableVertexAttribArray(sp.position);
			}
			if (sp.normal !== undefined) {
				gl.disableVertexAttribArray(sp.normal);
			}
			if (sp.texcoord !== undefined) {
				gl.disableVertexAttribArray(sp.texcoord);
			}
            if (sp.color !== undefined) {
                gl.disableVertexAttribArray(sp.color);
            }
		}
		
		gl.disable(gl.BLEND);
		/*gl.blendFuncSeparate( // just multiply dest RGB by its A
			gl.ZERO, gl.DST_ALPHA,
			gl.ZERO, gl.ONE
		);*/ 
		gl.disable(gl.DEPTH_TEST);
		//gl.flush();
        
        if (scene._visDbgBuf !== undefined && scene._visDbgBuf)
        {
            if (scene._vf.pickMode.toLowerCase() === "idbuf") {
                gl.viewport(0, 3*this.canvas.height/4, 
                            this.canvas.width/4, this.canvas.height/4);
                scene._fgnd._webgl.render(gl, scene._webgl.fboPick.tex);
            }
            
            if (shadowIntensity > 0) {
                gl.viewport(this.canvas.width/4, 3*this.canvas.height/4, 
                            this.canvas.width/4, this.canvas.height/4);
                scene._fgnd._webgl.render(gl, scene._webgl.fboShadow.tex);
            }
        }
		
		t1 = new Date().getTime() - t0;
			
		if (this.canvas.parent.statDiv) {
			this.canvas.parent.statDiv.appendChild(document.createElement("br"));
			this.canvas.parent.statDiv.appendChild(document.createTextNode("render: " + t1));
		}
		
		scene.drawableObjects = null;
	};
	
	Context.prototype.shutdown = function(scene)
	{
		var gl = this.ctx3d;
        
        if (gl === null || scene === null || !scene || scene.drawableObjects === null)
        {
            return;
        }
		
		// TODO; optimize traversal, matrices are not needed for cleanup
		scene.collectDrawableObjects(x3dom.fields.SFMatrix4f.identity(), scene.drawableObjects);
        
        if (scene._webgl.texture !== undefined && scene._webgl.texture)
        {
            gl.deleteTexture(scene._webgl.texture);
        }
        if (scene._webgl.shader.position !== undefined) 
        {
            gl.deleteBuffer(scene._webgl.buffers[1]);
            gl.deleteBuffer(scene._webgl.buffers[0]);
        }
		
		for (var i=0, n=scene.drawableObjects.length; i<n; i++)
		{
			var shape = scene.drawableObjects[i][1];
			var sp = shape._webgl.shader;
			
			if (shape._webgl.texture !== undefined && shape._webgl.texture)
			{
				gl.deleteTexture(shape._webgl.texture);
			}
			
			if (sp.position !== undefined) 
			{
				gl.deleteBuffer(shape._webgl.buffers[1]);
				gl.deleteBuffer(shape._webgl.buffers[0]);
			}
			
			if (sp.normal !== undefined) 
			{
				gl.deleteBuffer(shape._webgl.buffers[2]);
			}
			
			if (sp.texcoord !== undefined) 
			{
				gl.deleteBuffer(shape._webgl.buffers[3]);
			}
			
			if (sp.color !== undefined)
			{
				gl.deleteBuffer(shape._webgl.buffers[4]);
			}
		}
	};
    
    Context.prototype.loadCubeMap = function(gl, url, doc)
    {
        var texture = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

        var faces = [gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
                     gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
                     gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X];
        texture.pendingTextureLoads = -1;
        texture.textureCubeReady = false;
        
        for (var i=0; i<faces.length; i++) {
            texture.pendingTextureLoads++;
            var face = faces[i];
            var image = new Image();
            
            image.onload = function(texture, face, image, swap) {
                return function() {
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                    gl.texImage2D(face, 0, image, swap);
                    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
                    texture.pendingTextureLoads--;
                    if (texture.pendingTextureLoads < 0) {
                        texture.textureCubeReady = true;
                        x3dom.debug.logInfo("Loading CubeMap finished...");
						doc.needRender = true;
                    }
                };
            }(texture, face, image, (i<=1 || i>=4));
            
            // backUrl, frontUrl, bottomUrl, topUrl, leftUrl, rightUrl
            image.src = url[i];
        }
        
        return texture;
    };
    
    // start of fbo init stuff
    Context.prototype.emptyTexImage2D = function(gl, internalFormat, width, height, format, type)
    {
        /*try {
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
        }
        catch (e) */

            var bytes = 3;
            switch (internalFormat)
            {
                case gl.DEPTH_COMPONENT: bytes = 3; break;
                case gl.ALPHA: bytes = 1; break;
                case gl.RGB: bytes = 3; break;
                case gl.RGBA: bytes = 4; break;
                case gl.LUMINANCE: bytes = 1; break;
                case gl.LUMINANCE_ALPHA: bytes = 2; break;
            }
            var pixels = new WebGLUnsignedByteArray(width * height * bytes);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, pixels);
    };

    Context.prototype.initTex = function(gl, w, h, nearest)
    {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        
        this.emptyTexImage2D(gl, gl.RGBA, w, h, gl.RGBA, gl.UNSIGNED_BYTE);
        //this.emptyTexImage2D(gl, gl.DEPTH_COMPONENT16, w, h, gl.DEPTH_COMPONENT, gl.UNSIGNED_BYTE);
        
        if (nearest) {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        }
        else {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        //gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        //gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        
        tex.width = w;
        tex.height = h;
        
        return tex;
    };

    /*
     * Creates FBO with given size
     *   taken from FBO utilities for WebGL by Emanuele Ruffaldi 2009
     * Returned Object has
     *   rbo, fbo, tex, width, height
     */
    Context.prototype.initFbo = function(gl, w, h, nearest)
    {
        var fbo = gl.createFramebuffer();
        var rb = gl.createRenderbuffer();
        var tex = this.initTex(gl, w, h, nearest);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT, w, h);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        var r = {};
        r.fbo = fbo;
        r.rbo = rb;
        r.tex = tex;
        r.width = w;
        r.height = h;
        
        return r;
    };

	return setupContext;

})();
