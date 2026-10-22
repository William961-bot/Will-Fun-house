// chardecomp: export every function of the current program as JSON for `chardecomp static --ghidra-json`.
// Same schema as chardecomp/static_lite.py, plus decompiled C. Run headless:
//   analyzeHeadless <projdir> <proj> -import Game.exe -scriptPath <this dir> \
//       -postScript ExportCharDecomp.java /path/out.json [moduleName]
// or from the Script Manager (it asks for the output file).
//@category chardecomp

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.lang.Register;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.InstructionIterator;
import ghidra.program.model.listing.Listing;
import ghidra.program.model.scalar.Scalar;
import ghidra.program.model.symbol.RefType;
import ghidra.program.model.symbol.Reference;
import ghidra.program.model.symbol.SourceType;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;

public class ExportCharDecomp extends GhidraScript {
    private static final Set<String> FRAME_REGS = Set.of("RSP", "RBP", "ESP", "EBP", "RIP", "EIP", "SP", "FP", "PC");

    private static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': break;
                case '\t': b.append("\\t"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    private static String longs(Set<Long> xs) {
        StringBuilder b = new StringBuilder("[");
        for (Long x : xs) b.append(b.length() > 1 ? "," : "").append(x);
        return b.append(']').toString();
    }

    private static String strs(Set<String> xs) {
        StringBuilder b = new StringBuilder("[");
        for (String x : xs) b.append(b.length() > 1 ? "," : "").append(q(x));
        return b.append(']').toString();
    }

    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        File outFile = args.length > 0 ? new File(args[0]) : askFile("chardecomp export", "Save");
        String module = args.length > 1 ? args[1] : currentProgram.getName();
        long imageBase = currentProgram.getImageBase().getOffset();
        Listing listing = currentProgram.getListing();

        DecompInterface ifc = new DecompInterface();
        ifc.openProgram(currentProgram);
        try (PrintWriter w = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outFile), StandardCharsets.UTF_8))) {
            w.println("{\"module\": " + q(module) + ", \"image_base\": " + imageBase
                    + ", \"arch\": " + q(currentProgram.getLanguageID().toString())
                    + ", \"format\": " + q(currentProgram.getExecutableFormat())
                    + ", \"source\": \"ghidra\", \"binary_sha256\": " + q(String.valueOf(currentProgram.getExecutableSHA256()))
                    + ", \"functions\": [");
            boolean first = true;
            FunctionIterator it = currentProgram.getFunctionManager().getFunctions(true);
            int n = 0;
            while (it.hasNext() && !monitor.isCancelled()) {
                Function f = it.next();
                if (f.isExternal() || f.isThunk()) continue;
                Address entry = f.getEntryPoint();
                long rva = entry.getOffset() - imageBase;
                long size = f.getBody().getMaxAddress().getOffset() - entry.getOffset() + 1;

                Set<Long> calls = new TreeSet<>();
                for (Function c : f.getCalledFunctions(monitor)) {
                    if (!c.isExternal()) calls.add(c.getEntryPoint().getOffset() - imageBase);
                }
                Set<String> strings = new TreeSet<>();
                Set<Long> consts = new TreeSet<>();
                Set<Long> dataRefs = new TreeSet<>();
                Map<Long, String> fields = new TreeMap<>();
                StringBuilder asm = new StringBuilder();

                InstructionIterator ins = listing.getInstructions(f.getBody(), true);
                while (ins.hasNext()) {
                    Instruction i = ins.next();
                    asm.append(String.format("0x%x: %s\n", i.getAddress().getOffset() - imageBase, i.toString()));
                    for (Reference r : i.getReferencesFrom()) {
                        if (!r.getReferenceType().isData()) continue;
                        Address to = r.getToAddress();
                        if (!to.isMemoryAddress()) continue;
                        dataRefs.add(to.getOffset() - imageBase);
                        Data d = listing.getDataAt(to);
                        if (d != null && d.hasStringValue() && d.getValue() != null) strings.add(d.getValue().toString());
                    }
                    for (int op = 0; op < i.getNumOperands(); op++) {
                        Object[] objs = i.getOpObjects(op);
                        Register reg = null;
                        Scalar disp = null;
                        for (Object o : objs) {
                            if (o instanceof Register) reg = (Register) o;
                            else if (o instanceof Scalar) disp = (Scalar) o;
                        }
                        RefType rt = i.getOperandRefType(op);
                        boolean memory = rt != null && (rt.isRead() || rt.isWrite()) && reg != null;
                        if (memory && disp != null && !FRAME_REGS.contains(reg.getBaseRegister().getName().toUpperCase())) {
                            long off = disp.getSignedValue();
                            if (off >= 0 && off < 0x10000) {
                                String acc = fields.getOrDefault(off, "");
                                if (rt.isRead() && !acc.contains("r")) acc = "r" + acc;
                                if (rt.isWrite() && !acc.contains("w")) acc = acc + "w";
                                fields.put(off, acc);
                            }
                        } else if (disp != null && reg == null) {
                            consts.add(disp.getSignedValue());
                        }
                    }
                }

                String c = "";
                DecompileResults res = ifc.decompileFunction(f, 60, monitor);
                if (res != null && res.decompileCompleted() && res.getDecompiledFunction() != null) {
                    c = res.getDecompiledFunction().getC();
                }

                StringBuilder fs = new StringBuilder("[");
                for (Map.Entry<Long, String> e : fields.entrySet()) {
                    fs.append(fs.length() > 1 ? "," : "").append("[").append(e.getKey()).append(",").append(q(e.getValue())).append("]");
                }
                fs.append("]");

                // Ghidra's own placeholder names (FUN_00101234) are not recovered names: export them as unnamed.
                String name = f.getSymbol().getSource() == SourceType.DEFAULT ? "" : f.getName();
                w.print((first ? "" : ",\n") + "{\"rva\": " + rva + ", \"size\": " + size + ", \"name\": " + q(name)
                        + ", \"calls\": " + longs(calls) + ", \"strings\": " + strs(strings) + ", \"consts\": " + longs(consts)
                        + ", \"fields\": " + fs + ", \"data_refs\": " + longs(dataRefs)
                        + ", \"asm\": " + q(asm.toString()) + ", \"c\": " + q(c) + "}");
                first = false;
                if (++n % 500 == 0) println("chardecomp: exported " + n + " functions");
            }
            w.println("\n]}");
            println("chardecomp: exported " + n + " functions to " + outFile);
        } finally {
            ifc.dispose();
        }
    }
}
