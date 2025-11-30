import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export default function OptionCard({ 
  title, 
  description, 
  icon: Icon,
  selected, 
  onClick 
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left w-full ${
        selected 
          ? 'border-orange-500 bg-orange-50 shadow-lg' 
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {selected && (
        <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            selected ? 'bg-orange-500' : 'bg-slate-100'
          }`}>
            <Icon className={`w-6 h-6 ${selected ? 'text-white' : 'text-slate-600'}`} />
          </div>
        )}
        <div className="flex-1">
          <h3 className={`font-semibold text-lg mb-1 ${
            selected ? 'text-orange-900' : 'text-slate-900'
          }`}>
            {title}
          </h3>
          {description && (
            <p className={`text-sm ${
              selected ? 'text-orange-700' : 'text-slate-600'
            }`}>
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}