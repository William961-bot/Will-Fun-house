// chardecomp: apply verified function names from report/names.json to the current Ghidra program.
// Only claims that passed `chardecomp verify` are in that file, so the Ghidra project gains names that
// are backed by recordings. Each function also gets its statement as a plate comment.
//   analyzeHeadless <projdir> <proj> -process Game.exe -scriptPath <this dir> \
//       -postScript ApplyCharDecompNames.java /path/report/names.json
//@category chardecomp

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.SourceType;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class ApplyCharDecompNames extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        File in = args.length > 0 ? new File(args[0]) : askFile("chardecomp names.json", "Apply");
        JsonArray rows = JsonParser.parseString(Files.readString(in.toPath(), StandardCharsets.UTF_8)).getAsJsonArray();
        Address base = currentProgram.getImageBase();
        int named = 0, created = 0;
        for (JsonElement e : rows) {
            JsonObject o = e.getAsJsonObject();
            Address a = base.add(o.get("rva").getAsLong());
            String name = o.get("name").getAsString();
            Function f = getFunctionAt(a);
            if (f == null) {
                f = createFunction(a, name);
                if (f == null) {
                    printerr("chardecomp: no function at " + a + " for " + name);
                    continue;
                }
                created++;
            } else {
                f.setName(name, SourceType.USER_DEFINED);
            }
            if (o.has("comment") && !o.get("comment").getAsString().isEmpty()) {
                f.setComment("chardecomp (verified): " + o.get("comment").getAsString());
            }
            named++;
        }
        println("chardecomp: named " + named + " functions (" + created + " created)");
    }
}
