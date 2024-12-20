"use client";

import { useSuccessRedirect } from "@/app/hooks/useSuccessRedirect";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContestLevel } from "@repo/common/types";
import { contestFormSchema } from "@repo/common/zod";
import { Button, Form } from "@repo/ui/shad";
import { Loader2, SendHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast, { Toaster } from "react-hot-toast";
import { z } from "zod";
import { Confetti } from "./Confetti";
import { ContestBasicDetails } from "./ContestBasicDetails";
import { ContestProblemSelection } from "./ContestProblemSelection";
import { ContestRangeForm } from "./ContestRangeForm";
import { ContestSelectedProblems } from "./ContestSelectedProblems";

export function ContestForm() {
  const [selectedProblems, setSelectedProblems] = useState<
    { id: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { success, setSuccess } = useSuccessRedirect("Contest");
  const session = useSession();

  const form = useForm<z.infer<typeof contestFormSchema>>({
    resolver: zodResolver(contestFormSchema),
    defaultValues: {
      userName: session.data?.user.userName || "",
      contestName: "",
      difficultyLevel: ContestLevel.BEGINNER,
      startsOn: new Date().toISOString(),
      endsOn: "",
      problemIds: [],
    },
  });

  // Alert user when navigating away
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  async function onSubmit(values: z.infer<typeof contestFormSchema>) {
    if (values.problemIds.length === 0) {
      form.setError("problemIds", {
        type: "required",
        message: "At least one problem must be selected",
      });
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/contribute/contest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg);
      }
      setSuccess(true);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while creating the contest.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            <ContestBasicDetails control={form.control} />
            <ContestRangeForm control={form.control} watch={form.watch} />
            <div className="flex items-center justify-between">
              <div className="w-full md:w-6/12">
                <ContestProblemSelection
                  control={form.control}
                  selectedProblems={selectedProblems}
                  setSelectedProblems={setSelectedProblems}
                />
              </div>
              <div className="w-full md:w-4/12">
                <ContestSelectedProblems
                  watch={form.watch}
                  setValue={form.setValue}
                  selectedProblems={selectedProblems}
                  setSelectedProblems={setSelectedProblems}
                />
              </div>
            </div>
          </div>
          <Button disabled={loading} size={"lg"} type="submit">
            {loading ? (
              <span className="flex items-center">
                Adding
                <Loader2 className="w-4 h-4 animate-spin ml-1" />
              </span>
            ) : (
              <span className="flex items-center">
                Submit
                <SendHorizontal className="w-4 ml-1" />
              </span>
            )}
          </Button>
        </form>
      </Form>
      <Toaster />
      {success && <Confetti />}
    </>
  );
}
