"use client"

import { motion, useScroll } from "motion/react"

export const LineComponent = () => {
    const {scrollYProgress} = useScroll();
    //const scaleX = useTransform(scrollYProgress,[0,1],[0,1])
    //useMotionValueEvent(scrollYProgress,'change',(latest)=>{console.log(latest)})

  return (
    <motion.div style = {{scaleX:scrollYProgress/* ,transformOrigin:'0%' */}} className = 'origin-left h-1 bg-primary'></motion.div>
  )
}
