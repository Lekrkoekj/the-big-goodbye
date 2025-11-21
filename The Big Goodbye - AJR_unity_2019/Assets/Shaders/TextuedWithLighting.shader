// Upgrade NOTE: replaced '_Object2World' with 'unity_ObjectToWorld'

Shader "Vivify/Textured With Lighting"
{
    Properties
    {
        _Color ("Color Day", Color) = (1,1,1,1)
        _ColorNight ("Color Night", Color) = (1,1,1,1)
        _Tex ("Texture", 2D) = "white" {}
        _Glow ("Glow", Range (0, 1)) = 0
        _Ambient ("Ambient Lighting", Range (0, 1)) = 0
        _LightDir ("Light Direction Day", Vector) = (-1,-1,0,1)
        _LightDirNight ("Light Direction Night", Vector) = (-1,-1,0,1)
        _DayNightCycle("Day/Night Cycle", Range(0, 1)) = 1
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
            // make fog work
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
            float4 _ColorNight;
            float _Glow;
            float _Ambient;
            float4 _LightDir;
            float4 _LightDirNight;
            float _DayNightCycle;

            sampler2D _Tex;
            float4 _Tex_ST;
            
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
                float3 lightDir = normalize((_LightDir.xyz * _DayNightCycle) + (_LightDirNight * (1 - _DayNightCycle))) * -1.0;
                float shadow = max(dot(lightDir,i.normal),0);
                // sample the texture
                fixed4 col = ((_Color * _DayNightCycle) + (_ColorNight * (1 - _DayNightCycle))) * tex2D(_Tex, TRANSFORM_TEX(i.uv, _Tex));

                col = col * clamp(col * _Ambient + shadow,0.0,1.0);

                return col * float4(1.0,1.0,1.0,_Glow);
            }
            ENDCG
        }
    }
}
