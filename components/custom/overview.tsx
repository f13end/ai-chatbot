import { motion } from "framer-motion";
import Link from "next/link";

import { LogoOpenAI, MessageIcon, VercelIcon } from "./icons";

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-[500px] mt-20 mx-4 md:mx-0"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
    
        <p>
        This is a football AI manager built using cutting-edge technology. 
        It analyzes real-time match data, dynamically adjusting tactics and providing strategic insights. 
        Utilizing player attributes and match situations, 
        the AI makes decisions that mirror real-world football management. 
        It also simulates scouting, transfers, and press conferences to create a realistic and immersive football experience.

        </p>
  
      </div>
    </motion.div>
  );
};
