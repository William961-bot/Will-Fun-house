/* ============================================================
 * My First After Effects Plugin
 * ============================================================
 *
 * What this plugin does:
 *   Adds a "Brightness" slider to your layer. Drag it up,
 *   the layer gets brighter. Drag it down, it gets darker.
 *
 * How an AE plugin works (the short version):
 *   After Effects calls ONE function in your plugin: EffectMain.
 *   It passes a "command" telling you what it wants:
 *     - "Tell me about yourself"   -> PF_Cmd_ABOUT
 *     - "Set up your sliders"      -> PF_Cmd_PARAMS_SETUP
 *     - "Render this frame"        -> PF_Cmd_RENDER
 *   You handle the commands you care about and return.
 *
 * To build this you need Adobe's After Effects SDK.
 * Download it from: developer.adobe.com (free, requires account)
 * Then use the SDK's sample project as your starting point and
 * replace its main .c file with this one.
 * ============================================================ */

#include "AE_Effect.h"
#include "AE_EffectCB.h"
#include "AE_Macros.h"
#include "Param_Utils.h"
#include "AE_EffectCBSuites.h"


/* ---------- Plugin info (shown in the Effects menu) ---------- */
#define PLUGIN_NAME       "My First Plugin"
#define PLUGIN_MATCH_NAME "ADBE MyFirstPlugin"   /* unique internal ID */
#define PLUGIN_CATEGORY   "Sample Plug-ins"      /* which submenu */

#define VERSION_MAJOR 1
#define VERSION_MINOR 0


/* ---------- Our sliders ----------
 * Param 0 is ALWAYS the input layer (AE adds it for you).
 * We add one slider after it.
 */
enum {
    PARAM_INPUT = 0,    /* the layer pixels coming in */
    PARAM_BRIGHTNESS,   /* our slider */
    PARAM_COUNT         /* always last - counts the params */
};

/* A unique number for our slider, so AE can save/load it. */
#define BRIGHTNESS_ID 1


/* ============================================================
 * Command 1: "About" - shown in the About box
 * ============================================================ */
static PF_Err
About(PF_InData *in_data, PF_OutData *out_data)
{
    PF_SPRINTF(out_data->return_msg,
               "%s v%d.%d\nMy first After Effects plugin!",
               PLUGIN_NAME, VERSION_MAJOR, VERSION_MINOR);
    return PF_Err_NONE;
}


/* ============================================================
 * Command 2: "Global Setup" - tell AE what we can do
 * ============================================================ */
static PF_Err
GlobalSetup(PF_InData *in_data, PF_OutData *out_data)
{
    out_data->my_version = PF_VERSION(VERSION_MAJOR, VERSION_MINOR,
                                      0, PF_Stage_DEVELOP, 1);

    /* DEEP_COLOR_AWARE means we handle 16-bit color too. */
    out_data->out_flags = PF_OutFlag_DEEP_COLOR_AWARE;

    return PF_Err_NONE;
}


/* ============================================================
 * Command 3: "Params Setup" - create our sliders
 * ============================================================ */
static PF_Err
ParamsSetup(PF_InData *in_data, PF_OutData *out_data)
{
    PF_ParamDef def;
    AEFX_CLR_STRUCT(def);   /* zero it out first */

    /* Add a slider that goes from -100 to +100, defaults to 0. */
    PF_ADD_FLOAT_SLIDERX(
        "Brightness",            /* label shown in AE */
        -100.0, 100.0,           /* minimum and maximum values */
        -100.0, 100.0,           /* slider min/max (usually same) */
        0.0,                     /* default value */
        PF_Precision_HUNDREDTHS, /* how many decimal places */
        0, 0,
        BRIGHTNESS_ID            /* our unique ID from above */
    );

    out_data->num_params = PARAM_COUNT;
    return PF_Err_NONE;
}


/* ============================================================
 * The pixel function - runs ONCE PER PIXEL
 * ============================================================
 *
 * This is where the actual image effect happens.
 * AE gives us:
 *   - in:  the original pixel (red, green, blue, alpha)
 *   - out: where to write our new pixel
 * Each color channel is 0-255 (8-bit).
 *
 * We're given an "extra" pointer (refcon) where we stashed
 * our slider value before starting.
 */
static PF_Err
ProcessPixel(void *refcon, A_long x, A_long y,
             PF_Pixel8 *in, PF_Pixel8 *out)
{
    /* Get our brightness amount back out of refcon. */
    PF_FpLong brightness = *(PF_FpLong *)refcon;

    /* brightness is -100..+100, convert to -255..+255 to add. */
    PF_FpLong add = brightness * 2.55;

    /* Add brightness to each color channel, but clamp to 0-255
       so colors don't wrap around weirdly. */
    long r = in->red   + (long)add;
    long g = in->green + (long)add;
    long b = in->blue  + (long)add;

    if (r < 0)   r = 0;
    if (r > 255) r = 255;
    if (g < 0)   g = 0;
    if (g > 255) g = 255;
    if (b < 0)   b = 0;
    if (b > 255) b = 255;

    out->alpha = in->alpha;   /* leave transparency alone */
    out->red   = (A_u_char)r;
    out->green = (A_u_char)g;
    out->blue  = (A_u_char)b;

    return PF_Err_NONE;
}


/* ============================================================
 * Command 4: "Render" - draw one frame
 * ============================================================ */
static PF_Err
Render(PF_InData *in_data, PF_OutData *out_data,
       PF_ParamDef *params[], PF_LayerDef *output)
{
    /* Read the current slider value. */
    PF_FpLong brightness = params[PARAM_BRIGHTNESS]->u.fs_d.value;

    /* Loop over every pixel and call ProcessPixel for each one.
       PF_ITERATE is a helper macro that does the loop for us. */
    return PF_ITERATE(
        0,                                  /* progress base */
        in_data->extent_hint.bottom         /* height */
            - in_data->extent_hint.top,
        &params[PARAM_INPUT]->u.ld,         /* input pixels */
        &in_data->extent_hint,              /* area to process */
        (void *)&brightness,                /* extra data for ProcessPixel */
        ProcessPixel,                       /* the function to call */
        output                              /* output pixels */
    );
}


/* ============================================================
 * The main entry point - AE calls this for everything
 * ============================================================ */
DllExport PF_Err
EffectMain(PF_Cmd cmd,
           PF_InData *in_data, PF_OutData *out_data,
           PF_ParamDef *params[], PF_LayerDef *output,
           void *extra)
{
    switch (cmd) {
        case PF_Cmd_ABOUT:
            return About(in_data, out_data);

        case PF_Cmd_GLOBAL_SETUP:
            return GlobalSetup(in_data, out_data);

        case PF_Cmd_PARAMS_SETUP:
            return ParamsSetup(in_data, out_data);

        case PF_Cmd_RENDER:
            return Render(in_data, out_data, params, output);
    }
    return PF_Err_NONE;
}


/* ============================================================
 * What to try next:
 *   - Change ProcessPixel to invert colors:  out->red = 255 - in->red;
 *   - Add a second slider for contrast or saturation
 *   - Multiply red by brightness, leave green/blue alone -> red tint
 *
 * Where to learn more:
 *   - Adobe AE SDK guide (comes with the SDK download)
 *   - Look at the "Skeleton" sample inside the SDK
 * ============================================================ */
