Shader "Lekrkoekj/TransparentTextShader"
{
    Properties
    {
        _CurrentTexture ("Current Texture", Range(0,13)) = 0
        _Opacity("Opacity", Range(0, 1)) = 1
        _FiveHundredTwentyFive ("525", 2D) = "white" {}
        _Will ("Will", 2D) = "white" {}
        _You ("You", 2D) = "white" {}
        _Give ("Give", 2D) = "white" {}
        _Me ("Me", 2D) = "white" {}
        _Thirty ("30", 2D) = "white" {}
        _Make ("Make", 2D) = "white" {}
        _It ("It", 2D) = "white" {}
        _ThirtyFive ("35", 2D) = "white" {}
        _Forty ("40", 2D) = "white" {}
        _FortyFive ("45", 2D) = "white" {}
        _Fifty ("50", 2D) = "white" {}
        _Five ("5", 2D) = "white" {}
        _Transparent ("Transparent", 2D) = "white" {}
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

            float _CurrentTexture;
            float _Opacity;
            sampler2D _FiveHundredTwentyFive;
            float4 _FiveHundredTwentyFive_ST;
            sampler2D _Will;
            sampler2D _You;
            sampler2D _Give;
            sampler2D _Me;
            sampler2D _Thirty;
            sampler2D _Make;
            sampler2D _It;
            sampler2D _ThirtyFive;
            sampler2D _Forty;
            sampler2D _FortyFive;
            sampler2D _Fifty;
            sampler2D _Five;
            sampler2D _Transparent;

            v2f vert (appdata v)
            {
                v2f o;
                UNITY_SETUP_INSTANCE_ID(v);
                UNITY_INITIALIZE_OUTPUT(v2f, o);
                UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _FiveHundredTwentyFive);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float texIndex = floor(_CurrentTexture);
                fixed4 col = tex2D(_FiveHundredTwentyFive, i.uv);
                
                if(texIndex == 1) col = tex2D(_Will, i.uv);
                if(texIndex == 2) col = tex2D(_You, i.uv);
                if(texIndex == 3) col = tex2D(_Give, i.uv);
                if(texIndex == 4) col = tex2D(_Me, i.uv);
                if(texIndex == 5) col = tex2D(_Thirty, i.uv);
                if(texIndex == 6) col = tex2D(_Make, i.uv);
                if(texIndex == 7) col = tex2D(_It, i.uv);
                if(texIndex == 8) col = tex2D(_ThirtyFive, i.uv);
                if(texIndex == 9) col = tex2D(_Forty, i.uv);
                if(texIndex == 10) col = tex2D(_FortyFive, i.uv);
                if(texIndex == 11) col = tex2D(_Fifty, i.uv);
                if(texIndex == 12) col = tex2D(_Five, i.uv);
                if(texIndex == 13) col = tex2D(_Transparent, i.uv);

                col.a = 0;
                col *= _Opacity;
                return col;
            }
            ENDCG
        }
    }
}
