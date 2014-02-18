Render =  {
    
    GetTypeFromShaderName : function (gl, name)
    {
        var tokens = name.split(".");
        var type = tokens[tokens.length -1];
        if (type == "vs")
        {
            return gl.VERTEX_SHADER;
        }
        else if(type == "ps")
        {
            return gl.FRAGMENT_SHADER;
        }
        else
        {
            return null;
        }
    },

    CreateShader : function (gl, desc)
    {
        var shader = gl.createShader(Render.GetTypeFromShaderName(gl, desc.name));
        gl.shaderSource(shader, desc.src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            Debug.LogError("["+desc.name+"]\n"+gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    },

    CreateProgram : function (gl, pipeline)
    {
        var shaderProgram = gl.createProgram();
        for (var i = 0; i < pipeline.length; ++i)
        {
            var handle = pipeline[i].handle;
            if (handle != null)
                gl.attachShader(shaderProgram, handle); 
        }
        
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
        {
            Debug.LogError("error linking shaders");
            return null;
        }
        return shaderProgram;
    },

    CreateSimpleVertexAttribute : function (gl, attribName, program, vertices, advanced)
    {
        if (Core.IsUndefined(advanced))
        {
            advanced = {
                usage : gl.STATIC_DRAW
            };
        }
        var attribHandle = gl.getAttribLocation(program.GetHandle(), attribName); 
        var bufferHandle = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferHandle);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, advanced.usage);
        return {
            bufferHandle : bufferHandle,
            attributeHandle : attribHandle
        };
    },

    UseSimpleAttribute : function(gl, attr, elements, elementType, advanced)
    {
        if (Core.IsUndefined(advanced))
        {
            advanced = {
                stride : 0,
                offset : 0,
                normalized : gl.FALSE,
            };
        }
        gl.enableVertexAttribArray(attr.attributeHandle);
        gl.bindBuffer(gl.ARRAY_BUFFER, attr.bufferHandle);
        gl.vertexAttribPointer(attr.attributeHandle, elements, elementType, advanced.normalized, advanced.stride, advanced.offset);
    },

    UseProgram : function (gl, program)
    {
        gl.useProgram(program.GetHandle());
    },

    CreateTextureFromImage : function (gl, useMip, dim, htmlImage, advanced)
    {
        var internalAdvanced = null;
        if (Core.IsUndefined(advanced) || advanced == null)
        {
            internalAdvanced = {
                internalFormat : gl.RGBA,
                format : gl.RGBA,
                type : gl.UNSIGNED_BYTE
            };
        }
        else
        {
            internalAdvanced = {
                internalFormat : gl[advanced.internalFormat],
                format : gl[advanced.format],
                type : gl[advanced.type]
            };
        }
        var texHandle = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texHandle);
        if (htmlImage != null)
        {
            gl.texImage2D(gl.TEXTURE_2D, 0, internalAdvanced.internalFormat, internalAdvanced.format, internalAdvanced.type, htmlImage);
        }
        else
        {
            gl.texImage2D(gl.TEXTURE_2D, 0, internalAdvanced.internalFormat, dim.width, dim.height, 0, internalAdvanced.format, internalAdvanced.type, null);
        }
        if (useMip)
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texHandle;
    },

    CreateFrameBuffer : function (gl, width, height)
    {
        var fb = gl.createFramebuffer();
        fb.width = width;
        fb.height = height;
        return fb;

    }
}
