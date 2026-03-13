import React from "react";
import { CheckCircle, Heart } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import { motion } from "motion/react";

export function WelcomeHero() {
  return (
    <div className="relative bg-linear-to-br from-blue-50 to-indigo-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-6">
            {/* Logo/Brand */}
            <motion.div 
              className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-linear-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Heart className="size-8 text-white" fill="white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  OpenBook Care
                </h2>
                <p className="text-sm text-gray-600">Transparent Health Insurance</p>
              </div>
            </motion.div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl tracking-tight text-gray-900">
              Find the Perfect Health Insurance for Your Family
            </h1>
            
            <p className="text-lg lg:text-xl text-gray-600 max-w-xl">
              Compare health insurance plans from top providers, get personalized recommendations, and secure coverage that fits your needs and budget.
            </p>

            <div className="space-y-3">
              {[
                "Compare 100+ health insurance providers",
                "Free, unbiased recommendations",
                "Get quotes in under 5 minutes"
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="size-5 text-green-600 shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div 
              className="aspect-4/3 rounded-2xl overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N0b3IlMjBwYXRpZW50JTIwaGVhbHRoY2FyZXxlbnwxfHx8fDE3NzAyMzc1Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Healthcare professional with patient"
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            {/* Decorative elements */}
            <motion.div 
              className="absolute -z-10 -top-8 -right-8 size-32 bg-blue-200 rounded-full blur-3xl opacity-50"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.3, 0.5]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute -z-10 -bottom-8 -left-8 size-40 bg-indigo-200 rounded-full blur-3xl opacity-50"
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.5, 0.3, 0.5]
              }}
              transition={{ 
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}