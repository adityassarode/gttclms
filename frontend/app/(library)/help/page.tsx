"use client";

import {
  HelpCircle,
  BookOpen,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How many books can I borrow at once?",
    answer:
      "Each student can borrow up to 2 books and reserve 1 additional book at a time. This policy ensures fair access to our collection for all students.",
  },
  {
    question: "What is the borrowing period?",
    answer:
      "Books can be borrowed for 7 days. If you need more time, you can request a renewal through the library system, subject to availability.",
  },
  {
    question: "What happens if I return a book late?",
    answer:
      "A late fee of Rs 10 per day will be applied for each overdue book. The fee will be added to your account and must be settled before borrowing new books.",
  },
  {
    question: "How long does a reservation last?",
    answer:
      "Reservations remain active for 2 hours. Please collect your reserved book from the library counter within this time, or the reservation will automatically expire.",
  },
  {
    question: "Can I renew my borrowed books?",
    answer:
      "Yes, you can request a renewal for borrowed books if no one else has reserved them. Renewals extend the borrowing period by another 7 days.",
  },
  {
    question: "How do I donate books?",
    answer:
      "You can donate books through the Donations section of this app. Simply fill out the donation form with book details and upload photos. Our library staff will review and add approved donations to the collection.",
  },
  {
    question: "What if a book I want is not available?",
    answer:
      "You can reserve the book, and we'll notify you when it becomes available. Alternatively, you can suggest new books for the library to acquire through the Help Center.",
  },
  {
    question: "How do I report a damaged book?",
    answer:
      "Please report any damaged books immediately at the library counter or through the Help Center. Do not attempt to repair books yourself as this may cause further damage.",
  },
  {
    question: "How do I expand a data analysis graph to full screen?",
    answer:
      "In the Data Analysis Graph Gallery, double-click any graph card to open it in full screen. Press Esc to return to the normal view.",
  },
];

const quickLinks = [
  {
    title: "Library Hours",
    description: "Mon-Fri: 8AM-8PM, Sat: 9AM-5PM",
    icon: Clock,
  },
  {
    title: "Total Collection",
    description: "Over 10,000 books across 50+ categories",
    icon: BookOpen,
  },
  {
    title: "Late Fee Policy",
    description: "Rs 10 per day for overdue books",
    icon: AlertTriangle,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
            <HelpCircle className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Help Center
            </h1>
            <p className="text-muted-foreground">
              Find answers and get support
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Card key={link.title} className="border-border/50 bg-card">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <link.icon className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{link.title}</p>
                <p className="text-sm text-muted-foreground">
                  {link.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* FAQs */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Quick answers to common questions about our library services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Need More Help?</CardTitle>
              <CardDescription>
                Get in touch with our library team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href="mailto:gttclmss@gmail.com"
                className="flex items-center gap-3 rounded-xl p-3 bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Email Support
                  </p>
                  <p className="text-sm text-muted-foreground">
                    gttclmss@gmail.com
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>

              <a
                href="tel:+919141630309"
                className="flex items-center gap-3 rounded-xl p-3 bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Call Us
                  </p>
                  <p className="text-sm text-muted-foreground">
                    +91 914 163 0309
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>

              <div className="flex items-start gap-3 rounded-xl p-3 bg-secondary/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Visit Us</p>
                  <p className="text-sm text-muted-foreground">
                    Government Tool Room & Training Centre (GTTC)
                    <br />
                    Industrial Estate, Udyambag, Belgaum 590008.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <p className="font-medium text-foreground">Suggestions?</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Help us improve! Share your ideas for new books or features.
              </p>
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <a href="mailto:gttclmss@gmail.com?subject=GTTC%20Library%20Feedback">
                  Submit Feedback
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
