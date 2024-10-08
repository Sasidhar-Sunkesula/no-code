import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/shad";
import { SubmissionData } from "./CodeEditor";
import { CodeBlock } from "./CodeBlock";
import React from "react";
import { Check, Cpu, Timer, X } from "lucide-react";

export function TestCaseResults({ submissionResults }: { submissionResults: SubmissionData }) {
    const syntaxError = submissionResults.testCaseResults.find(result => result.stderr && result.stderr.includes('SyntaxError'));

    if (syntaxError) {
        return (
            <div className='flex flex-col gap-y-3'>
                <div className='font-semibold text-xl'>{submissionResults.status}</div>
                <div className="text-destructive font-medium">
                    {syntaxError.stderr}
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-y-3'>
            <div className="flex items-center justify-between py-1">
                <div className={`font-semibold text-xl ${submissionResults.status === "Accepted" ? "text-green-600" : "text-red-600"}`}>{submissionResults.status}</div>
                <div className="flex items-center gap-x-4">
                    <div className="text-sm flex items-center gap-x-1">
                        <Timer className="w-3" /> {((submissionResults.runTime ?? 0) * 1000).toFixed(2)} ms
                    </div>
                    <div className="text-sm flex items-center gap-x-1">
                        <Cpu className="w-3" /> {((submissionResults.memory ?? 0) / 1024).toFixed(1)} MB
                    </div>
                </div>
            </div>
            <Tabs defaultValue={submissionResults.testCaseResults[0]?.id.toString()} className="w-full space-y-3">
                <TabsList className="space-x-3">
                    {
                        submissionResults.testCaseResults.map((result, index) => (
                            <TabsTrigger key={result.id} value={result.id.toString()}>
                                {result.status === "Accepted"
                                    ? <Check className="w-5 mr-1 text-green-500" />
                                    : <X className="w-5 mr-1" />}
                                Case {index + 1}
                            </TabsTrigger>
                        ))
                    }
                </TabsList>
                {
                    submissionResults.testCaseResults.map((result) => (
                        <TabsContent key={result.id} value={result.id.toString()} className="flex flex-col gap-y-3">
                            {result.stderr && result.status !== "Accepted" ? (
                                <>
                                    <CodeBlock title="Status" content={result.status} />
                                    <div className="text-destructive font-medium">
                                        {result.stderr}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CodeBlock title="Status" content={result.status} />
                                    <CodeBlock title="Input" content={result.testCase.input} />
                                    <CodeBlock title="Expected Output" content={result.testCase.expectedOutput} />
                                    <CodeBlock title="Your Output" content={result.stdout === "undefined\n" ? "No output" : result.stdout} />
                                </>
                            )}
                        </TabsContent>
                    ))
                }
            </Tabs>
        </div>
    );
}