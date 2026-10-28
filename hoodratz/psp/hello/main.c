// Hoodratz PSP step 1: prove the pspdev toolchain builds an EBOOT that runs.
#include <pspkernel.h>
#include <pspdebug.h>
#include <pspdisplay.h>

PSP_MODULE_INFO("Hoodratz Hello", 0, 1, 0);
PSP_MAIN_THREAD_ATTR(THREAD_ATTR_USER | THREAD_ATTR_VFPU);

// HOME button -> "Exit game?" dialog needs an exit callback.
static int exit_callback(int arg1, int arg2, void *common) {
    sceKernelExitGame();
    return 0;
}

static int callback_thread(SceSize args, void *argp) {
    int cbid = sceKernelCreateCallback("Exit Callback", exit_callback, NULL);
    sceKernelRegisterExitCallback(cbid);
    sceKernelSleepThreadCB();
    return 0;
}

static void setup_callbacks(void) {
    int thid = sceKernelCreateThread("update_thread", callback_thread, 0x11, 0xFA0, 0, NULL);
    if (thid >= 0) sceKernelStartThread(thid, 0, NULL);
}

int main(void) {
    setup_callbacks();
    pspDebugScreenInit();
    pspDebugScreenPrintf("HOODRATZ PSP: hello world\n");
    pspDebugScreenPrintf("pspdev toolchain OK. Press HOME to quit.\n");

    int frames = 0;
    while (1) {
        pspDebugScreenSetXY(0, 3);
        pspDebugScreenPrintf("frames: %d", frames++);
        sceDisplayWaitVblankStart();
    }
    return 0;
}
