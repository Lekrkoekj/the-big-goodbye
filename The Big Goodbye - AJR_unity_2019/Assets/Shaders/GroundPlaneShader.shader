Shader "BeatSaber/Lit Glow (Radial Fade Color)"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
        _Tex ("Texture", 2D) = "white" {}
        _Glow ("Glow", Range (0, 1)) = 0
        _Ambient ("Ambient Lighting", Range (0, 1)) = 0
        _LightDir ("Light Direction", Vector) = (-1,-1,0,1)

        // --- Radial fade controls (UV space) ---
        _RadialCenter ("Radial Center (UV)", Vector) = (0.5, 0.5, 0, 0)
        _RadialRadius ("Radial Radius", Range(0, 1)) = 0.3
        _RadialFeather ("Radial Feather", Range(0, 1)) = 0.2
        _FadeColor ("Fade Color", Color) = (0, 0, 0, 1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 100

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float3 normal : NORMAL;

                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
                float4 worldPos : TEXCOORD1;
                float3 viewDir : TEXCOORD2;
                float3 normal : NORMAL;
                
                UNITY_VERTEX_OUTPUT_STEREO
            };

            float4 _Color;
            float _Glow;
            float _Ambient;
            float4 _LightDir;

            sampler2D _Tex;
            float4 _Tex_ST;

            // Radial fade uniforms
            float4 _RadialCenter;   // xy = center in UV
            float  _RadialRadius;   // start of fade
            float  _RadialFeather;  // fade width
            float4 _FadeColor;      // color to fade to
            
            v2f vert (appdata v)
            {
                v2f o;

                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);
                
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                o.worldPos = mul(unity_ObjectToWorld, v.vertex);
                o.viewDir = normalize(UnityWorldSpaceViewDir(o.worldPos));
                o.normal = UnityObjectToWorldNormal(v.normal);
                return o;
            }
            
            fixed4 frag (v2f i) : SV_Target
            {
                float3 lightDir = normalize(_LightDir.xyz) * -1.0;
                float shadow = max(dot(lightDir, i.normal), 0);
                
                // base texture + simple lighting
                fixed4 col = _Color * tex2D(_Tex, TRANSFORM_TEX(i.uv, _Tex));
                col = col * clamp(col * _Ambient + shadow, 0.0, 1.0);

                // --- Radial fade to custom color ---
                float d = distance(i.uv, _RadialCenter.xy);
                float t = smoothstep(_RadialRadius, _RadialRadius + _RadialFeather, d);
                col.rgb = lerp(col.rgb, _FadeColor.rgb, t);

                return col * float4(1.0, 1.0, 1.0, _Glow);
            }
            ENDCG
        }
    }
}
