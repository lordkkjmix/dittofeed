import {
  AccessTime,
  Autorenew,
  CheckCircle,
  HelpOutline,
} from "@mui/icons-material";
import { Box, CircularProgress, Tooltip } from "@mui/material";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import { useCallback, useEffect, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";

import { useComputedPropertyPeriodsQuery } from "../lib/useComputedPropertyPeriodsQuery";
import { TRIGGER_RECOMPUTE_PROPERTIES_MUTATION_KEY } from "../lib/useTriggerRecomputePropertiesMutation";

const transitionStyles = {
  ".fade-enter": {
    opacity: 0,
  },
  ".fade-enter-active": {
    opacity: 1,
    transition: "opacity 300ms ease-in",
  },
  ".fade-exit": {
    opacity: 1,
  },
  ".fade-exit-active": {
    opacity: 0,
    transition: "opacity 300ms ease-out",
  },
  "> span": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "20px",
    minWidth: "20px",
  },
};

export function RecomputedRecentlyIcon() {
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useComputedPropertyPeriodsQuery(
    { step: "ComputeAssignments" }, // Fetch periods for the assignments step
    {
      select: (d) => {
        if (d.periods.length === 0) {
          return { mostRecentRecomputeTime: null, isAnyStale: false };
        }

        let maxTime: Date | null = null;
        let anyStale = false;
        const now = new Date();

        for (const p of d.periods) {
          if (!p.lastRecomputed) continue;
          const computedTime = new Date(p.lastRecomputed);
          if (maxTime === null || computedTime > maxTime) {
            maxTime = computedTime;
          }
          if (differenceInSeconds(now, computedTime) >= 30) {
            anyStale = true;
          }
        }
        return { mostRecentRecomputeTime: maxTime, isAnyStale: anyStale };
      },
      refetchInterval: 5 * 1000,
    },
  );

  const previousMostRecentRecomputeTimeRef = useRef<Date | null | undefined>();

  // Runs only when mostRecentRecomputeTime changes from a non-null value
  useEffect(() => {
    const currentTime = data?.mostRecentRecomputeTime;
    const previousTime = previousMostRecentRecomputeTimeRef.current;

    // Run only if the previous time existed (was not null/undefined)
    // and the current time is different from the previous time.
    // Compare using getTime() for reliability.
    if (previousTime && currentTime?.getTime() !== previousTime.getTime()) {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      queryClient.invalidateQueries({
        queryKey: ["usersCount"],
      });
    }
    // Update the ref *after* the check for the next render
    previousMostRecentRecomputeTimeRef.current = currentTime;
  }, [data?.mostRecentRecomputeTime, queryClient]); // Depend on the time and queryClient

  const isRecomputing = useIsMutating({
    mutationKey: TRIGGER_RECOMPUTE_PROPERTIES_MUTATION_KEY,
  });

  let currentState: string;
  if (isRecomputing > 0) {
    currentState = "recomputing";
  } else if (isPending) {
    currentState = "pending";
  } else if (isError) {
    currentState = "error";
  } else if (data.mostRecentRecomputeTime === null) {
    currentState = "notComputed";
  } else if (data.isAnyStale) {
    currentState = "stale";
  } else {
    currentState = "upToDate";
  }

  // Refactored rendering logic to avoid nested ternaries
  const renderContent = useCallback(() => {
    switch (currentState) {
      case "recomputing":
        return (
          <Tooltip title="Recomputing...">
            <Autorenew
              fontSize="small"
              sx={{
                animation: "spin 2s linear infinite",
                "@keyframes spin": {
                  "0%": {
                    transform: "rotate(0deg)",
                  },
                  "100%": {
                    transform: "rotate(360deg)",
                  },
                },
              }}
            />
          </Tooltip>
        );
      case "pending":
        return <CircularProgress size={20} />;
      case "notComputed":
        return (
          <Tooltip title="Not computed yet">
            <HelpOutline fontSize="small" />
          </Tooltip>
        );
      case "stale":
        return (
          <Tooltip title="Last computed more than 30 seconds ago">
            <AccessTime fontSize="small" />
          </Tooltip>
        );
      case "upToDate":
      default:
        return (
          <Tooltip title="Data is up to date">
            <CheckCircle fontSize="small" />
          </Tooltip>
        );
    }
  }, [currentState]);

  if (currentState === "error") {
    return null;
  }

  return (
    <Box sx={transitionStyles}>
      <SwitchTransition mode="out-in">
        <CSSTransition
          key={currentState}
          addEndListener={(node, done) => {
            node.addEventListener("transitionend", done, false);
          }}
          classNames="fade"
        >
          {/* Use the helper function to render content */}
          {renderContent()}
        </CSSTransition>
      </SwitchTransition>
    </Box>
  );
}
