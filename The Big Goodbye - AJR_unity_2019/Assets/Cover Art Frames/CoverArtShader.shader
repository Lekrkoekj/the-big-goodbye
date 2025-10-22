Shader "Lekrkoekj/CoverArtShader"
{
    Properties
    {
        _Multiplier("Multiplier", Range(0,3)) = 1
        _CurrentFrame("Current Frame", Range(1,15)) = 14
        _Frame1 ("Frame 1", 2D) = "white" {}
        _Frame2 ("Frame 2", 2D) = "white" {}
        _Frame3 ("Frame 3", 2D) = "white" {}
        _Frame4 ("Frame 4", 2D) = "white" {}
        _Frame5 ("Frame 5", 2D) = "white" {}
        _Frame6 ("Frame 6", 2D) = "white" {}
        _Frame7 ("Frame 7", 2D) = "white" {}
        _Frame8 ("Frame 8", 2D) = "white" {}
        _Frame9 ("Frame 9", 2D) = "white" {}
        _Frame10 ("Frame 10", 2D) = "white" {}
        _Frame11 ("Frame 11", 2D) = "white" {}
        _Frame12 ("Frame 12", 2D) = "white" {}
        _Frame13 ("Frame 13", 2D) = "white" {}
        _Frame14 ("Frame 14", 2D) = "white" {}
        _Frame15 ("Frame 15", 2D) = "white" {}
    }
    SubShader
    {
        Tags { 
            "Queue"="Transparent" 
            "RenderType"="Transparent" 
        }
        Blend One OneMinusSrcColor
        ZWrite Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            // VivifyTemplate Libraries
            // #include "Assets/VivifyTemplate/Utilities/Shader Functions/Noise.cginc"
            // #include "Assets/VivifyTemplate/Utilities/Shader Functions/Colors.cginc"
            // #include "Assets/VivifyTemplate/Utilities/Shader Functions/Math.cginc"
            // #include "Assets/VivifyTemplate/Utilities/Shader Functions/Easings.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                float4 vertex : SV_POSITION;
                UNITY_VERTEX_OUTPUT_STEREO
            };

            sampler2D _Frame1;
            float4 _Frame1_ST;
            float _Multiplier;
            float _CurrentFrame;

            sampler2D _Frame2;
            sampler2D _Frame3;
            sampler2D _Frame4;
            sampler2D _Frame5;
            sampler2D _Frame6;
            sampler2D _Frame7;
            sampler2D _Frame8;
            sampler2D _Frame9;
            sampler2D _Frame10;
            sampler2D _Frame11;
            sampler2D _Frame12;
            sampler2D _Frame13;
            sampler2D _Frame14;
            sampler2D _Frame15;

            v2f vert (appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _Frame1);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float texIndex = floor(_CurrentFrame);
                fixed4 col = tex2D(_Frame1, i.uv);

                if(texIndex == 2) col = tex2D(_Frame2, i.uv);
                if(texIndex == 3) col = tex2D(_Frame3, i.uv);
                if(texIndex == 4) col = tex2D(_Frame4, i.uv);
                if(texIndex == 5) col = tex2D(_Frame5, i.uv);
                if(texIndex == 6) col = tex2D(_Frame6, i.uv);
                if(texIndex == 7) col = tex2D(_Frame7, i.uv);
                if(texIndex == 8) col = tex2D(_Frame8, i.uv);
                if(texIndex == 9) col = tex2D(_Frame9, i.uv);
                if(texIndex == 10) col = tex2D(_Frame10, i.uv);
                if(texIndex == 11) col = tex2D(_Frame11, i.uv);
                if(texIndex == 12) col = tex2D(_Frame12, i.uv);
                if(texIndex == 13) col = tex2D(_Frame13, i.uv);
                if(texIndex == 14) col = tex2D(_Frame14, i.uv);
                if(texIndex == 15) col = tex2D(_Frame15, i.uv);

                col.rgb *= _Multiplier;
                col.a = 0;
                return col;
            }
            ENDCG
        }
    }
}
