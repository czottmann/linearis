export function outputUsageInfo(program) {
    const subcommands = [];
    function collectSubcommands(cmd, prefix = "") {
        const currentName = prefix ? `${prefix} ${cmd.name()}` : cmd.name();
        const commands = cmd.commands;
        if (commands.length === 0) {
            if (prefix) {
                subcommands.push({ name: currentName, command: cmd });
            }
        }
        else {
            commands.forEach((subcmd) => collectSubcommands(subcmd, currentName));
        }
    }
    collectSubcommands(program);
    subcommands.sort((a, b) => a.name.localeCompare(b.name));
    subcommands.forEach(({ command }) => {
        command.outputHelp();
        console.log("\n---\n");
    });
}
