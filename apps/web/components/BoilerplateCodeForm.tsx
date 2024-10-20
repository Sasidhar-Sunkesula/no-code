import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription, Popover, PopoverTrigger, Button, PopoverContent, Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@repo/ui/shad";
import { Editor } from "@monaco-editor/react";
import { Check, ChevronsUpDown, Loader2Icon } from "lucide-react";
import { Control } from "react-hook-form";
import { BoilerplateCodes } from "./ProblemContributionForm";
import { ProblemFormType } from "@repo/common/types";
import { cn } from "@repo/ui/utils";

interface BoilerplateCodeFormProps {
    control: Control<ProblemFormType, any>;
    selectedLanguage: string;
    handleLanguageChange: (language: string) => void;
    boilerplateCodes: BoilerplateCodes;
    handleBoilerplateChange: (value: string) => void;
    languages: {
        id: number;
        judge0Name: string;
    }[];
}

export function BoilerplateCodeForm({
    control,
    selectedLanguage,
    boilerplateCodes,
    handleLanguageChange,
    handleBoilerplateChange,
    languages
}: BoilerplateCodeFormProps) {
    return (
        <FormField
            control={control}
            name="boilerplateCodes"
            render={({ field }) => (
                <FormItem className="space-y-4">
                    <div className="space-y-2 space-x-2">
                        <FormLabel>Select Language</FormLabel>
                        <FormControl>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-[250px] justify-between",
                                                !selectedLanguage && "text-muted-foreground"
                                            )}
                                        >
                                            {selectedLanguage
                                                ? languages.find(
                                                    (language) => language.judge0Name === selectedLanguage
                                                )?.judge0Name
                                                : "Select language"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[250px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search language..." />
                                        <CommandList>
                                            <CommandEmpty>No language found.</CommandEmpty>
                                            <CommandGroup>
                                                {languages.map((language) => (
                                                    <CommandItem
                                                        value={language.judge0Name}
                                                        key={language.id}
                                                        onSelect={handleLanguageChange}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                language.judge0Name === selectedLanguage
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {language.judge0Name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </FormControl>
                        <FormDescription>
                            This is the language of the boiler plate code, at least one boilerplate code should be given.
                        </FormDescription>
                    </div>
                    <div className="space-y-2">
                        <FormLabel>Boilerplate Code</FormLabel>
                        <FormControl>
                            <Editor
                                height={"50vh"}
                                width={"45vw"}
                                language={selectedLanguage}
                                value={boilerplateCodes[selectedLanguage]}
                                onChange={(value) => {
                                    handleBoilerplateChange(value || "");
                                    field.onChange({
                                        ...field.value,
                                        [selectedLanguage]: value || ""
                                    });
                                }}
                                theme="vs-dark"
                                loading={<Loader2Icon className='w-5 animate-spin' />}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 16,
                                    padding: {
                                        top: 6,
                                        bottom: 4
                                    },
                                    smoothScrolling: true,
                                    lineNumbers: 'on',
                                    roundedSelection: false,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    selectOnLineNumbers: true
                                }}
                            />
                        </FormControl>
                        <FormDescription>
                            The boiler plate code should contain a function that user has to implement and the input handling code for that function. The input handling code should also call the function.
                        </FormDescription>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}